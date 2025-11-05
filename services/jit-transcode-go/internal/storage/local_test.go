package storage

import (
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalStorage(t *testing.T) {
	tmpDir := t.TempDir()
	storage := NewLocalStorage(tmpDir)

	t.Run("PathExists - non-existent file", func(t *testing.T) {
		exists, err := storage.PathExists("nonexistent.txt")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if exists {
			t.Error("Expected file to not exist")
		}
	})

	t.Run("WriteFile and PathExists", func(t *testing.T) {
		testPath := "test/file.txt"
		testData := []byte("hello world")

		err := storage.WriteFile(testPath, testData, WriteOptions{ContentType: "text/plain"})
		if err != nil {
			t.Fatalf("Failed to write file: %v", err)
		}

		exists, err := storage.PathExists(testPath)
		if err != nil {
			t.Fatalf("Unexpected error checking existence: %v", err)
		}
		if !exists {
			t.Error("Expected file to exist after writing")
		}

		fullPath := filepath.Join(tmpDir, testPath)
		readData, err := os.ReadFile(fullPath)
		if err != nil {
			t.Fatalf("Failed to read file: %v", err)
		}

		if string(readData) != string(testData) {
			t.Errorf("Expected %s, got %s", string(testData), string(readData))
		}
	})

	t.Run("CreateReadStream", func(t *testing.T) {
		testPath := "stream/test.bin"
		testData := []byte{0x01, 0x02, 0x03, 0x04}

		err := storage.WriteFile(testPath, testData, WriteOptions{})
		if err != nil {
			t.Fatalf("Failed to write file: %v", err)
		}

		reader, err := storage.CreateReadStream(testPath)
		if err != nil {
			t.Fatalf("Failed to create read stream: %v", err)
		}
		defer reader.Close()

		readData, err := io.ReadAll(reader)
		if err != nil {
			t.Fatalf("Failed to read stream: %v", err)
		}

		if len(readData) != len(testData) {
			t.Errorf("Expected %d bytes, got %d", len(testData), len(readData))
		}

		for i := range testData {
			if readData[i] != testData[i] {
				t.Errorf("Byte %d: expected %d, got %d", i, testData[i], readData[i])
			}
		}
	})

	t.Run("GetLength", func(t *testing.T) {
		testPath := "length/test.dat"
		testData := make([]byte, 1024)

		err := storage.WriteFile(testPath, testData, WriteOptions{})
		if err != nil {
			t.Fatalf("Failed to write file: %v", err)
		}

		length, err := storage.GetLength(testPath)
		if err != nil {
			t.Fatalf("Failed to get length: %v", err)
		}

		if length != 1024 {
			t.Errorf("Expected length 1024, got %d", length)
		}
	})

	t.Run("Nested directories", func(t *testing.T) {
		testPath := "deep/nested/path/file.txt"
		testData := []byte("nested")

		err := storage.WriteFile(testPath, testData, WriteOptions{})
		if err != nil {
			t.Fatalf("Failed to write nested file: %v", err)
		}

		exists, err := storage.PathExists(testPath)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if !exists {
			t.Error("Expected nested file to exist")
		}
	})
}

