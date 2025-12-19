package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"search/internal/api"
	"search/internal/opensearch"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	opensearchURL := getEnv("OPENSEARCH_URL", "http://localhost:9200")
	port := getEnv("PORT", "8080")
	corsOrigins := getEnv("CORS_ALLOWED_ORIGINS", "*")

	logger.Info("Starting search service",
		"opensearch_url", opensearchURL,
		"port", port,
		"cors_origins", corsOrigins,
	)

	osClient, err := opensearch.NewClient(opensearchURL, logger)
	if err != nil {
		logger.Error("Failed to create OpenSearch client", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := waitForOpenSearch(ctx, osClient, logger); err != nil {
		logger.Error("OpenSearch connection failed", "error", err)
		os.Exit(1)
	}

	if err := osClient.EnsureIndex(ctx); err != nil {
		logger.Error("Failed to ensure index", "error", err)
		os.Exit(1)
	}

	router := api.NewRouter(osClient, logger, corsOrigins)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		logger.Info("Shutdown signal received")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("Server shutdown error", "error", err)
		}
	}()

	logger.Info("Server starting", "port", port)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		logger.Error("Server error", "error", err)
		os.Exit(1)
	}

	logger.Info("Server stopped")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func waitForOpenSearch(ctx context.Context, client opensearch.SearchClient, logger *slog.Logger) error {
	maxRetries := 30
	for i := 0; i < maxRetries; i++ {
		if err := client.Ping(ctx); err == nil {
			logger.Info("OpenSearch connection established")
			return nil
		}
		logger.Info("Waiting for OpenSearch...", "attempt", i+1)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	return errors.New("failed to connect to OpenSearch after max retries")
}
