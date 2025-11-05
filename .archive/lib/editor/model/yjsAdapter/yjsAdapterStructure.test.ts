import { StructureTestModel } from "./StructureTestModel";
import { TestChild } from "./TestChild";
import { appendTestChild } from "./appendTestChild";
import { assertModelsSync } from "./assertModelsSync";

describe("yjsAdapterStructure", () => {
  test("Structures model data correctly", () => {
    assertModelsSync(
      new StructureTestModel({ id: "test", dataProp: "set-before-sync" }),

      (left, _right, leftDoc, _rightDoc) => {
        left.nestedParent.setTitle("Parent Title");
        const child = appendTestChild(
          left.nestedParent,
          new TestChild({ id: "child", title: "Child" })
        );
        appendTestChild(child, new TestChild({ id: "grandchild" }));

        expect(leftDoc.getMap("root").toJSON()).toMatchInlineSnapshot(`
          {
            "$modelType": "ef/StructureTestModel",
            "data": [
              {
                "key": "dataProp",
                "val": "set-before-sync",
              },
              {
                "key": "otherDataProp",
                "val": 0,
              },
            ],
            "id": "test",
            "nestedParent": {
              "$modelType": "ef/Parent",
              "childRefs": [
                {
                  "$modelType": "ChildRef",
                  "id": "child",
                },
              ],
              "childStore": {
                "child": {
                  "$modelType": "ef/Child",
                  "childRefs": [
                    {
                      "$modelType": "ChildRef",
                      "id": "grandchild",
                    },
                  ],
                  "data": [
                    {
                      "key": "title",
                      "val": "Child",
                    },
                  ],
                  "id": "child",
                  "rootRect": {
                    "$modelType": "ef/Rectangle",
                    "data": [
                      {
                        "key": "x",
                        "val": 0,
                      },
                      {
                        "key": "y",
                        "val": 0,
                      },
                      {
                        "key": "width",
                        "val": 0,
                      },
                      {
                        "key": "height",
                        "val": 0,
                      },
                    ],
                  },
                },
                "grandchild": {
                  "$modelType": "ef/Child",
                  "childRefs": [],
                  "data": [
                    {
                      "key": "title",
                      "val": "",
                    },
                  ],
                  "id": "grandchild",
                  "rootRect": {
                    "$modelType": "ef/Rectangle",
                    "data": [
                      {
                        "key": "x",
                        "val": 0,
                      },
                      {
                        "key": "y",
                        "val": 0,
                      },
                      {
                        "key": "width",
                        "val": 0,
                      },
                      {
                        "key": "height",
                        "val": 0,
                      },
                    ],
                  },
                },
              },
              "data": [
                {
                  "key": "title",
                  "val": "Parent Title",
                },
              ],
              "id": "nestedParent",
            },
            "nestedProp": {
              "$modelType": "ef/NestedStructureTestModel",
              "data": [
                {
                  "key": "dataProp",
                  "val": "test-string",
                },
                {
                  "key": "otherDataProp",
                  "val": 0,
                },
              ],
            },
          }
        `);
      }
    );
  });
});
