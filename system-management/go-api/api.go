package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

const (
	apiPrefix      = "/api/v1"
	requestIDKey   = "X-Request-ID"
	maxBodyBytes   = 1 << 20 // 1MB
	defaultAddress = ":8080"
)

type Config struct {
	Addr            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
	RequestTimeout  time.Duration
}

func loadConfig() Config {
	cfg := Config{
		Addr:            envOr("API_ADDR", defaultAddress),
		ReadTimeout:     envDurationOr("API_READ_TIMEOUT", 5*time.Second),
		WriteTimeout:    envDurationOr("API_WRITE_TIMEOUT", 10*time.Second),
		IdleTimeout:     envDurationOr("API_IDLE_TIMEOUT", 60*time.Second),
		ShutdownTimeout: envDurationOr("API_SHUTDOWN_TIMEOUT", 10*time.Second),
		RequestTimeout:  envDurationOr("API_REQUEST_TIMEOUT", 8*time.Second),
	}
	return cfg
}

func envOr(name string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

func envDurationOr(name string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	d, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return d
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type apiResponse struct {
	Data  any       `json:"data,omitempty"`
	Error *APIError `json:"error,omitempty"`
	Meta  any       `json:"meta,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, payload apiResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("encode response failed: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, code string, message string) {
	writeJSON(w, status, apiResponse{Error: &APIError{Code: code, Message: message}})
}

func readJSONBody(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return err
	}
	if decoder.More() {
		return errors.New("body must contain a single JSON object")
	}
	return nil
}

type Middleware func(http.Handler) http.Handler

func chainMiddleware(handler http.Handler, middlewares ...Middleware) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (recorder *statusRecorder) WriteHeader(status int) {
	recorder.status = status
	recorder.ResponseWriter.WriteHeader(status)
}

var requestCounter uint64

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := atomic.AddUint64(&requestCounter, 1)
		requestID := "req-" + strconv.FormatUint(id, 10)
		w.Header().Set(requestIDKey, requestID)
		r.Header.Set(requestIDKey, requestID)
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		log.Printf("%s %s status=%d request_id=%s duration=%s", r.Method, r.URL.Path, recorder.status, r.Header.Get(requestIDKey), time.Since(start))
	})
}

func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("panic recovered: %v", recovered)
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unexpected server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func timeoutMiddleware(timeout time.Duration) Middleware {
	return func(next http.Handler) http.Handler {
		return http.TimeoutHandler(next, timeout, `{"error":{"code":"TIMEOUT","message":"request timeout"}}`)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func methodNotAllowed(w http.ResponseWriter, allowed ...string) {
	w.Header().Set("Allow", strings.Join(allowed, ", "))
	writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "unsupported HTTP method")
}

type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type UpdateUserRequest struct {
	Name  *string `json:"name"`
	Email *string `json:"email"`
}

type UserRepository interface {
	List(ctx context.Context) ([]User, error)
	GetByID(ctx context.Context, id int64) (User, bool, error)
	Create(ctx context.Context, req CreateUserRequest) (User, error)
	Update(ctx context.Context, id int64, req UpdateUserRequest) (User, bool, error)
	Delete(ctx context.Context, id int64) (bool, error)
}

type InMemoryUserRepository struct {
	mu     sync.RWMutex
	nextID int64
	items  map[int64]User
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		nextID: 1,
		items:  make(map[int64]User),
	}
}

func (repo *InMemoryUserRepository) List(ctx context.Context) ([]User, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	result := make([]User, 0, len(repo.items))
	for _, item := range repo.items {
		result = append(result, item)
	}
	return result, nil
}

func (repo *InMemoryUserRepository) GetByID(ctx context.Context, id int64) (User, bool, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	item, ok := repo.items[id]
	return item, ok, nil
}

func (repo *InMemoryUserRepository) Create(ctx context.Context, req CreateUserRequest) (User, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	now := time.Now().UTC()
	item := User{
		ID:        repo.nextID,
		Name:      strings.TrimSpace(req.Name),
		Email:     strings.TrimSpace(req.Email),
		CreatedAt: now,
		UpdatedAt: now,
	}

	repo.items[item.ID] = item
	repo.nextID++
	return item, nil
}

func (repo *InMemoryUserRepository) Update(ctx context.Context, id int64, req UpdateUserRequest) (User, bool, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	item, ok := repo.items[id]
	if !ok {
		return User{}, false, nil
	}
	if req.Name != nil {
		item.Name = strings.TrimSpace(*req.Name)
	}
	if req.Email != nil {
		item.Email = strings.TrimSpace(*req.Email)
	}
	item.UpdatedAt = time.Now().UTC()
	repo.items[id] = item
	return item, true, nil
}

func (repo *InMemoryUserRepository) Delete(ctx context.Context, id int64) (bool, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	if _, ok := repo.items[id]; !ok {
		return false, nil
	}
	delete(repo.items, id)
	return true, nil
}

type App struct {
	cfg   Config
	users UserRepository
}

func NewApp(cfg Config, users UserRepository) *App {
	return &App{cfg: cfg, users: users}
}

func (app *App) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(apiPrefix+"/health", app.handleHealth)
	mux.HandleFunc(apiPrefix+"/users", app.handleUsers)
	mux.HandleFunc(apiPrefix+"/users/", app.handleUserByID)

	return chainMiddleware(
		mux,
		recoverMiddleware,
		requestIDMiddleware,
		loggingMiddleware,
		timeoutMiddleware(app.cfg.RequestTimeout),
		corsMiddleware,
	)
}

func (app *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w, http.MethodGet)
		return
	}

	writeJSON(w, http.StatusOK, apiResponse{
		Data: map[string]any{
			"service": "go-rest-api",
			"status":  "ok",
			"time":    time.Now().UTC(),
		},
	})
}

func (app *App) handleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		app.handleListUsers(w, r)
	case http.MethodPost:
		app.handleCreateUser(w, r)
	default:
		methodNotAllowed(w, http.MethodGet, http.MethodPost)
	}
}

func (app *App) handleUserByID(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDFromPath(r.URL.Path, apiPrefix+"/users/")
	if !ok {
		writeError(w, http.StatusBadRequest, "INVALID_ID", "user id must be a positive integer")
		return
	}

	switch r.Method {
	case http.MethodGet:
		app.handleGetUser(w, r, id)
	case http.MethodPut, http.MethodPatch:
		app.handleUpdateUser(w, r, id)
	case http.MethodDelete:
		app.handleDeleteUser(w, r, id)
	default:
		methodNotAllowed(w, http.MethodGet, http.MethodPut, http.MethodPatch, http.MethodDelete)
	}
}

func parseIDFromPath(path string, prefix string) (int64, bool) {
	raw := strings.TrimPrefix(path, prefix)
	raw = strings.Trim(raw, "/")
	if raw == "" || strings.Contains(raw, "/") {
		return 0, false
	}

	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func (app *App) handleListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := app.users.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "LIST_FAILED", "unable to fetch users")
		return
	}
	writeJSON(w, http.StatusOK, apiResponse{Data: users, Meta: map[string]any{"count": len(users)}})
}

func (app *App) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	var body CreateUserRequest
	if err := readJSONBody(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}

	if strings.TrimSpace(body.Name) == "" || strings.TrimSpace(body.Email) == "" {
		writeError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "name and email are required")
		return
	}

	created, err := app.users.Create(r.Context(), body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CREATE_FAILED", "unable to create user")
		return
	}
	writeJSON(w, http.StatusCreated, apiResponse{Data: created})
}

func (app *App) handleGetUser(w http.ResponseWriter, r *http.Request, id int64) {
	user, found, err := app.users.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "GET_FAILED", "unable to fetch user")
		return
	}
	if !found {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	writeJSON(w, http.StatusOK, apiResponse{Data: user})
}

func (app *App) handleUpdateUser(w http.ResponseWriter, r *http.Request, id int64) {
	var body UpdateUserRequest
	if err := readJSONBody(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}

	if body.Name == nil && body.Email == nil {
		writeError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "at least one field is required")
		return
	}

	updated, found, err := app.users.Update(r.Context(), id, body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "UPDATE_FAILED", "unable to update user")
		return
	}
	if !found {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	writeJSON(w, http.StatusOK, apiResponse{Data: updated})
}

func (app *App) handleDeleteUser(w http.ResponseWriter, r *http.Request, id int64) {
	deleted, err := app.users.Delete(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DELETE_FAILED", "unable to delete user")
		return
	}
	if !deleted {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	writeJSON(w, http.StatusOK, apiResponse{Data: map[string]any{"deleted": true}})
}

func (app *App) run(ctx context.Context) error {
	server := &http.Server{
		Addr:         app.cfg.Addr,
		Handler:      app.routes(),
		ReadTimeout:  app.cfg.ReadTimeout,
		WriteTimeout: app.cfg.WriteTimeout,
		IdleTimeout:  app.cfg.IdleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("server listening on %s", app.cfg.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), app.cfg.ShutdownTimeout)
		defer cancel()
		return server.Shutdown(shutdownCtx)
	case err := <-errCh:
		if err != nil {
			return err
		}
		return nil
	}
}

func main() {
	cfg := loadConfig()
	app := NewApp(cfg, NewInMemoryUserRepository())

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := app.run(ctx); err != nil {
		log.Fatalf("server terminated with error: %v", err)
	}
}
