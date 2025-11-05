package storage

import (
	"io"
)

type WriteOptions struct {
	ContentType string
}

type StorageProvider interface {
	PathExists(path string) (bool, error)
	CreateReadStream(path string) (io.ReadCloser, error)
	WriteFile(path string, data []byte, opts WriteOptions) error
	GetLength(path string) (int64, error)
}

