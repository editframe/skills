package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type LocalStorage struct {
	baseDir string
}

func NewLocalStorage(baseDir string) *LocalStorage {
	return &LocalStorage{baseDir: baseDir}
}

func (ls *LocalStorage) PathExists(path string) (bool, error) {
	fullPath := filepath.Join(ls.baseDir, path)
	_, err := os.Stat(fullPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, fmt.Errorf("failed to check path existence: %w", err)
}

func (ls *LocalStorage) CreateReadStream(path string) (io.ReadCloser, error) {
	fullPath := filepath.Join(ls.baseDir, path)
	file, err := os.Open(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	return file, nil
}

func (ls *LocalStorage) WriteFile(path string, data []byte, opts WriteOptions) error {
	fullPath := filepath.Join(ls.baseDir, path)
	
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	
	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}
	
	return nil
}

func (ls *LocalStorage) GetLength(path string) (int64, error) {
	fullPath := filepath.Join(ls.baseDir, path)
	info, err := os.Stat(fullPath)
	if err != nil {
		return 0, fmt.Errorf("failed to stat file: %w", err)
	}
	return info.Size(), nil
}

