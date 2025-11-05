package superjson

import (
	"encoding/json"
	"fmt"
	"time"
)

type SuperJSON struct {
	JSON any   `json:"json"`
	Meta *Meta `json:"meta,omitempty"`
}

type Meta struct {
	Values    map[string][]any `json:"values,omitempty"`
	Referrers map[string][]any `json:"referrers,omitempty"`
}

func Unmarshal(data []byte, v any) error {
	var sj SuperJSON
	if err := json.Unmarshal(data, &sj); err != nil {
		return fmt.Errorf("failed to unmarshal superjson: %w", err)
	}

	jsonBytes, err := json.Marshal(sj.JSON)
	if err != nil {
		return fmt.Errorf("failed to marshal json field: %w", err)
	}

	if err := json.Unmarshal(jsonBytes, v); err != nil {
		return fmt.Errorf("failed to unmarshal into target: %w", err)
	}

	if sj.Meta != nil && sj.Meta.Values != nil {
		if err := applyMetadata(v, sj.Meta.Values); err != nil {
			return fmt.Errorf("failed to apply metadata: %w", err)
		}
	}

	return nil
}

func Marshal(v any) ([]byte, error) {
	jsonData, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal value: %w", err)
	}

	var jsonInterface any
	if err := json.Unmarshal(jsonData, &jsonInterface); err != nil {
		return nil, fmt.Errorf("failed to unmarshal to interface: %w", err)
	}

	sj := SuperJSON{
		JSON: jsonInterface,
	}

	return json.Marshal(sj)
}

func applyMetadata(v any, values map[string][]any) error {
	for path, typeAndValue := range values {
		if len(typeAndValue) < 2 {
			continue
		}

		typeName, ok := typeAndValue[0].(string)
		if !ok {
			continue
		}

		switch typeName {
		case "Date":
			if dateStr, ok := typeAndValue[1].(string); ok {
				t, err := time.Parse(time.RFC3339Nano, dateStr)
				if err != nil {
					t, err = time.Parse(time.RFC3339, dateStr)
					if err != nil {
						continue
					}
				}
				if err := setValueAtPath(v, path, &t); err != nil {
					return err
				}
			}
		case "Map":
			if err := setValueAtPath(v, path, typeAndValue[1]); err != nil {
				return err
			}
		case "Set":
			if err := setValueAtPath(v, path, typeAndValue[1]); err != nil {
				return err
			}
		}
	}
	return nil
}

func setValueAtPath(_ any, _ string, _ any) error {
	return nil
}

func Stringify(v any) (string, error) {
	bytes, err := Marshal(v)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func Parse(data string, v any) error {
	return Unmarshal([]byte(data), v)
}
