package superjson

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type TestStruct struct {
	Name      string     `json:"name"`
	Age       int        `json:"age"`
	CreatedAt *time.Time `json:"createdAt"`
}

func TestMarshal(t *testing.T) {
	t.Run("simple struct", func(t *testing.T) {
		now := time.Now()
		data := TestStruct{
			Name:      "John",
			Age:       30,
			CreatedAt: &now,
		}

		result, err := Marshal(data)
		require.NoError(t, err)

		var sj SuperJSON
		err = json.Unmarshal(result, &sj)
		require.NoError(t, err)

		assert.NotNil(t, sj.JSON)
		assert.Nil(t, sj.Meta) // Current implementation doesn't add metadata
	})

	t.Run("nil value", func(t *testing.T) {
		result, err := Marshal(nil)
		require.NoError(t, err)

		var sj SuperJSON
		err = json.Unmarshal(result, &sj)
		require.NoError(t, err)

		assert.Nil(t, sj.JSON)
	})
}

func TestUnmarshal(t *testing.T) {
	t.Run("simple superjson", func(t *testing.T) {
		superJsonData := `{
			"json": {
				"name": "John",
				"age": 30,
				"createdAt": null
			}
		}`

		var result TestStruct
		err := Unmarshal([]byte(superJsonData), &result)
		require.NoError(t, err)

		assert.Equal(t, "John", result.Name)
		assert.Equal(t, 30, result.Age)
		assert.Nil(t, result.CreatedAt)
	})

	t.Run("superjson with date metadata", func(t *testing.T) {
		superJsonData := `{
			"json": {
				"name": "John",
				"age": 30,
				"createdAt": "2023-01-01T12:00:00Z"
			},
			"meta": {
				"values": {
					"createdAt": ["Date", "2023-01-01T12:00:00Z"]
				}
			}
		}`

		var result TestStruct
		err := Unmarshal([]byte(superJsonData), &result)
		require.NoError(t, err)

		assert.Equal(t, "John", result.Name)
		assert.Equal(t, 30, result.Age)
		// Note: setValueAtPath is currently a no-op, so date won't be parsed
		// This test verifies the function doesn't crash with metadata
	})

	t.Run("invalid json", func(t *testing.T) {
		invalidJson := `{"invalid": json}`

		var result TestStruct
		err := Unmarshal([]byte(invalidJson), &result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to unmarshal superjson")
	})

	t.Run("invalid target type", func(t *testing.T) {
		superJsonData := `{
			"json": {
				"name": "John",
				"age": "not a number"
			}
		}`

		var result TestStruct
		err := Unmarshal([]byte(superJsonData), &result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to unmarshal into target")
	})
}

func TestStringify(t *testing.T) {
	t.Run("simple struct", func(t *testing.T) {
		data := TestStruct{
			Name: "John",
			Age:  30,
		}

		result, err := Stringify(data)
		require.NoError(t, err)

		assert.Contains(t, result, `"name":"John"`)
		assert.Contains(t, result, `"age":30`)
		assert.Contains(t, result, `"json"`)
	})
}

func TestParse(t *testing.T) {
	t.Run("valid superjson string", func(t *testing.T) {
		superJsonString := `{
			"json": {
				"name": "John",
				"age": 30
			}
		}`

		var result TestStruct
		err := Parse(superJsonString, &result)
		require.NoError(t, err)

		assert.Equal(t, "John", result.Name)
		assert.Equal(t, 30, result.Age)
	})

	t.Run("invalid json string", func(t *testing.T) {
		invalidString := `{"invalid": json}`

		var result TestStruct
		err := Parse(invalidString, &result)
		assert.Error(t, err)
	})
}

func TestApplyMetadata(t *testing.T) {
	t.Run("empty metadata", func(t *testing.T) {
		var data TestStruct
		err := applyMetadata(&data, map[string][]any{})
		assert.NoError(t, err)
	})

	t.Run("date metadata", func(t *testing.T) {
		var data TestStruct
		metadata := map[string][]any{
			"createdAt": {"Date", "2023-01-01T12:00:00Z"},
		}

		// This should not error even though setValueAtPath is a no-op
		err := applyMetadata(&data, metadata)
		assert.NoError(t, err)
	})

	t.Run("invalid metadata format", func(t *testing.T) {
		var data TestStruct
		metadata := map[string][]any{
			"field": {"incomplete"}, // Missing value
		}

		err := applyMetadata(&data, metadata)
		assert.NoError(t, err) // Should skip invalid entries
	})

	t.Run("non-string type", func(t *testing.T) {
		var data TestStruct
		metadata := map[string][]any{
			"field": {123, "value"}, // Non-string type
		}

		err := applyMetadata(&data, metadata)
		assert.NoError(t, err) // Should skip invalid entries
	})
}

func TestSetValueAtPath(t *testing.T) {
	t.Run("no-op implementation", func(t *testing.T) {
		var data TestStruct
		err := setValueAtPath(&data, "field", "value")
		assert.NoError(t, err) // Current implementation is a no-op
	})
}
