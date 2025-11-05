package storage

import (
	"context"
	"fmt"
	"io"

	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
)

type GCSStorage struct {
	client     *storage.Client
	bucketName string
	ctx        context.Context
}

func NewGCSStorage(bucketName string) (*GCSStorage, error) {
	ctx := context.Background()
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client: %w", err)
	}

	return &GCSStorage{
		client:     client,
		bucketName: bucketName,
		ctx:        ctx,
	}, nil
}

func (gcs *GCSStorage) PathExists(path string) (bool, error) {
	bucket := gcs.client.Bucket(gcs.bucketName)
	obj := bucket.Object(path)

	_, err := obj.Attrs(gcs.ctx)
	if err == storage.ErrObjectNotExist {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check object existence: %w", err)
	}

	return true, nil
}

func (gcs *GCSStorage) CreateReadStream(path string) (io.ReadCloser, error) {
	bucket := gcs.client.Bucket(gcs.bucketName)
	obj := bucket.Object(path)

	reader, err := obj.NewReader(gcs.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create reader: %w", err)
	}

	return reader, nil
}

func (gcs *GCSStorage) WriteFile(path string, data []byte, opts WriteOptions) error {
	bucket := gcs.client.Bucket(gcs.bucketName)
	obj := bucket.Object(path)

	writer := obj.NewWriter(gcs.ctx)
	if opts.ContentType != "" {
		writer.ContentType = opts.ContentType
	}

	if _, err := writer.Write(data); err != nil {
		writer.Close()
		return fmt.Errorf("failed to write data: %w", err)
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("failed to close writer: %w", err)
	}

	return nil
}

func (gcs *GCSStorage) GetLength(path string) (int64, error) {
	bucket := gcs.client.Bucket(gcs.bucketName)
	obj := bucket.Object(path)

	attrs, err := obj.Attrs(gcs.ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get object attributes: %w", err)
	}

	return attrs.Size, nil
}

func (gcs *GCSStorage) ListObjects(prefix string) ([]string, error) {
	bucket := gcs.client.Bucket(gcs.bucketName)
	query := &storage.Query{Prefix: prefix}

	var objects []string
	it := bucket.Objects(gcs.ctx, query)
	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate objects: %w", err)
		}
		objects = append(objects, attrs.Name)
	}

	return objects, nil
}

func (gcs *GCSStorage) Close() error {
	return gcs.client.Close()
}

