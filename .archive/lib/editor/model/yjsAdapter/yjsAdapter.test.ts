import {
  model,
  Model,
  idProp,
  tProp,
  types,
  getSnapshot,
  applySet,
  applyDelete,
  arrayActions,
  prop,
  detach,
} from "mobx-keystone";
import { connectModelToYJS, yjsAdapterSnapshotProcessor } from "./yjsAdapter";
import * as Y from "yjs";
import { assertModelsSync } from "./assertModelsSync";
import { TestParent } from "./TestParent";
import { TestChild } from "./TestChild";
import { YKeyValue } from "y-utility/y-keyvalue";
import { KVFromEntries } from "./KVFromEntries";
import { TestRectangle } from "./TestRectangle";

describe("yjsAdapter", () => {
  @model("ef/WithMaybe")
  class WithMaybe extends Model(
    {
      id: idProp,
      maybe: tProp(types.maybe(types.string), undefined).withSetter(),
    },
    yjsAdapterSnapshotProcessor,
  ) {}
  test("syncs maybe types", () => {
    assertModelsSync(
      new WithMaybe({ id: "maybe" }),
      (left, right, _leftDoc, _rightDoc) => {
        left.setMaybe("A");
        assert.equal(left.maybe, "A");
        assert.equal(right.maybe, "A");

        right.setMaybe("B");
        assert.equal(left.maybe, "B");
        assert.equal(right.maybe, "B");

        left.setMaybe(undefined);
        assert.equal(left.maybe, undefined);
        assert.equal(right.maybe, undefined);
      },
    );
  });

  describe("simple values", () => {
    test("syncs changes from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new TestParent({ id: "parent" });
      connectModelToYJS(parent, root);

      const parentData = root.get("data") as Y.Array<any>;
      const parenteDataKV = new YKeyValue(parentData);

      doc.transact(() => {
        parenteDataKV.set("title", "Parent Title");
      }, "override-local");
      assert.equal(parent.title, "Parent Title");
    });

    test("syncs deletes from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const maybe = new WithMaybe({ maybe: "value" });
      connectModelToYJS(maybe, root);

      const parentData = root.get("data") as Y.Array<any>;
      const parenteDataKV = new YKeyValue(parentData);

      doc.transact(() => {
        parenteDataKV.delete("maybe");
      }, "override-local");
      assert.equal(maybe.maybe, undefined);
    });

    test("syncs additions from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const maybe = new WithMaybe({});
      connectModelToYJS(maybe, root);

      const parentData = root.get("data") as Y.Array<any>;
      const parenteDataKV = new YKeyValue(parentData);
      parentData.toJSON();

      doc.transact(() => {
        parenteDataKV.delete("maybe");
      }, "override-local");

      doc.transact(() => {
        parenteDataKV.set("maybe", "value");
      }, "override-local");
      assert.equal(maybe.maybe, "value");
    });

    test("syncs initial values from Keystone model to YJS", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const maybe = new WithMaybe({ maybe: "value" });
      connectModelToYJS(maybe, root);

      const parentData = root.get("data") as Y.Array<any>;
      const parenteDataKV = new YKeyValue(parentData);

      assert.equal(parenteDataKV.get("maybe"), "value");
    });

    test("syncs changes from Keystone model to YJS", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const maybe = new WithMaybe({ maybe: "value" });
      connectModelToYJS(maybe, root);

      const parentData = root.get("data") as Y.Array<any>;
      const parenteDataKV = new YKeyValue(parentData);

      maybe.setMaybe("new value");
      assert.equal(parenteDataKV.get("maybe"), "new value");
    });

    test("syncs deletes from Keystone model to YJS", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const maybe = new WithMaybe({ maybe: "value" });
      connectModelToYJS(maybe, root);

      const parentData = root.get("data") as Y.Array<any>;
      const parenteDataKV = new YKeyValue(parentData);

      maybe.setMaybe(undefined);
      assert.equal(parenteDataKV.get("maybe"), undefined);
    });

    test("syncs additions from Keystone model to YJS", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const maybe = new WithMaybe({});
      connectModelToYJS(maybe, root);

      const parentData = root.get("data") as Y.Array<any>;
      const parenteDataKV = new YKeyValue(parentData);

      maybe.setMaybe("value");
      assert.equal(parenteDataKV.get("maybe"), "value");
    });

    test("syncs initial values from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parentData = root.set("data", new Y.Array<any>());
      const parenteDataKV = new YKeyValue(parentData);

      parenteDataKV.set("maybe", "value");
      const maybe = new WithMaybe({});
      connectModelToYJS(maybe, root);

      assert.equal(maybe.maybe, "value");
    });
  });

  describe("keystone records", () => {
    test("Throws an error if the record is not a dictionary of models", () => {
      @model("ef/IllegalRecord")
      class IllegalRecord extends Model({
        illegalRecord: tProp(types.record(types.number), () => ({})),
      }) {}
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new IllegalRecord({});
      assert.throws(() => {
        connectModelToYJS(parent, root);
      }, "keystone record types ONLY supported as dictionaries of other models.");
    });

    test("Loads initial snapshot from YJS", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      root.set("childStore", new Y.Map()).set(
        "test-child",
        new Y.Map([
          ["id", "test-child"],
          ["$modelType", "ef/Child"],
        ]),
      );
      const parent = new TestParent({ id: "parent" });
      connectModelToYJS(parent, root);
      assert.deepEqual(getSnapshot(parent.childStore), {
        "test-child": {
          id: "test-child",
          data: [{ key: "title", val: "" }],
          childRefs: [],
          $modelType: "ef/Child",
          rootRect: {
            $modelType: "ef/Rectangle",
            data: [
              { key: "x", val: 0 },
              { key: "y", val: 0 },
              { key: "width", val: 0 },
              { key: "height", val: 0 },
            ],
          },
        },
      });
    });

    test("allows setting with maybe model", () => {
      @model("ef/WithMaybeNested")
      class WithMaybeNested extends Model(
        {
          id: idProp,
          maybeRect: tProp(
            types.maybe(types.model<TestRectangle>(TestRectangle)),
          ).withSetter(),
        },
        yjsAdapterSnapshotProcessor,
      ) {}

      assertModelsSync(
        new WithMaybeNested({ id: "maybe" }),
        async (left, right, _leftDoc, rightDoc) => {
          left.setMaybeRect(new TestRectangle({}));

          assert.deepEqual(getSnapshot(right), {
            $modelType: "ef/WithMaybeNested",
            data: [],
            id: "maybe",
            maybeRect: {
              $modelType: "ef/Rectangle",
              data: [
                { key: "x", val: 0 },
                { key: "y", val: 0 },
                { key: "width", val: 0 },
                { key: "height", val: 0 },
              ],
            },
          });

          assert.deepEqual(rightDoc.get("root").toJSON(), {
            $modelType: "ef/WithMaybeNested",
            data: [],
            id: "maybe",
            maybeRect: {
              $modelType: "ef/Rectangle",
              data: [
                { key: "x", val: 0 },
                { key: "y", val: 0 },
                { key: "width", val: 0 },
                { key: "height", val: 0 },
              ],
            },
          });
        },
      );
    });

    test("allows detaching with maybe model", () => {
      @model("ef/WithMaybeNested")
      class WithMaybeNested extends Model(
        {
          id: idProp,
          maybeRect: tProp(
            types.maybe(types.model<TestRectangle>(TestRectangle)),
          ).withSetter(),
        },
        yjsAdapterSnapshotProcessor,
      ) {}

      assertModelsSync(
        new WithMaybeNested({ id: "maybe" }),
        async (left, right, _leftDoc, rightDoc) => {
          left.setMaybeRect(new TestRectangle({}));
          detach(right.maybeRect!);

          assert.deepEqual(getSnapshot(right), {
            $modelType: "ef/WithMaybeNested",
            data: [],
            id: "maybe",
            maybeRect: undefined,
          });

          assert.deepEqual(rightDoc.get("root").toJSON(), {
            $modelType: "ef/WithMaybeNested",
            data: [],
            id: "maybe",
          });
        },
      );
    });

    test("syncs changes inside maybe models", () => {
      @model("ef/WithMaybeNested")
      class WithMaybeNested extends Model(
        {
          id: idProp,
          maybeRect: tProp(
            types.maybe(types.model<TestRectangle>(TestRectangle)),
          ).withSetter(),
        },
        yjsAdapterSnapshotProcessor,
      ) {}

      assertModelsSync(
        new WithMaybeNested({ id: "maybe" }),
        async (left, right, _leftDoc, rightDoc) => {
          left.setMaybeRect(new TestRectangle({}));

          left.maybeRect?.setX(10);

          assert.deepEqual(getSnapshot(right), {
            $modelType: "ef/WithMaybeNested",
            data: [],
            id: "maybe",
            maybeRect: {
              $modelType: "ef/Rectangle",
              data: [
                { key: "x", val: 10 },
                { key: "y", val: 0 },
                { key: "width", val: 0 },
                { key: "height", val: 0 },
              ],
            },
          });

          assert.deepEqual(rightDoc.get("root").toJSON(), {
            $modelType: "ef/WithMaybeNested",
            data: [],
            id: "maybe",
            maybeRect: {
              $modelType: "ef/Rectangle",
              data: [
                { key: "y", val: 0 },
                { key: "width", val: 0 },
                { key: "height", val: 0 },
                { key: "x", val: 10 },
              ],
            },
          });
        },
      );
    });

    test("syncs additions from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new TestParent({ id: "parent" });
      connectModelToYJS(parent, root);
      applySet(
        parent.childStore,
        "test-child",
        new TestChild({ id: "test-child" }),
      );

      expect(root.toJSON()).toEqual({
        $modelType: "ef/Parent",
        childRefs: [],
        childStore: {
          "test-child": {
            $modelType: "ef/Child",
            childRefs: [],
            data: [{ key: "title", val: "" }],
            id: "test-child",
            rootRect: {
              $modelType: "ef/Rectangle",
              data: [
                { key: "x", val: 0 },
                { key: "y", val: 0 },
                { key: "width", val: 0 },
                { key: "height", val: 0 },
              ],
            },
          },
        },
        data: [{ key: "title", val: "" }],
        id: "parent",
      });
    });

    test("syncs deletes from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new TestParent({ id: "parent" });
      connectModelToYJS(parent, root);
      applySet(
        parent.childStore,
        "test-child",
        new TestChild({ id: "test-child" }),
      );

      applyDelete(parent.childStore, "test-child");

      expect(root.toJSON()).toEqual({
        $modelType: "ef/Parent",
        childRefs: [],
        childStore: {},
        data: [{ key: "title", val: "" }],
        id: "parent",
      });
    });

    test("Syncs additions from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new TestParent({ id: "parent" });
      connectModelToYJS(parent, root);

      doc.transact(() => {
        const dataArray = new Y.Array<{ key: string; val: any }>();
        dataArray.push([{ key: "title", val: "Cool Title" }]);
        (root.get("childStore") as Y.Map<any>).set(
          "test-child",
          new Y.Map([
            ["id", "test-child"],
            ["$modelType", "ef/Child"],
            ["data", dataArray],
          ]),
        );
      }, "override-local");

      expect(getSnapshot(parent.childStore["test-child"])).toEqual({
        id: "test-child",
        $modelType: "ef/Child",
        childRefs: [],
        data: [{ key: "title", val: "Cool Title" }],
        rootRect: {
          $modelType: "ef/Rectangle",
          data: [
            { key: "x", val: 0 },
            { key: "y", val: 0 },
            { key: "width", val: 0 },
            { key: "height", val: 0 },
          ],
        },
      });
    });

    test("Refuses changes to the record map itself.", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new TestParent({ id: "parent" });
      connectModelToYJS(parent, root);
      applySet(
        parent.childStore,
        "test-child",
        new TestChild({ id: "test-child" }),
      );

      assert.throws(() => {
        doc.transact(() => {
          (root.get("childStore") as Y.Map<any>).set(
            "test-child",
            new Y.Map([
              ["id", "test-child"],
              ["$modelType", "ef/Child"],
            ]),
          );
        }, "override-local");
      }, /Updating record maps not supported/);
    });

    test("syncs deletes from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new TestParent({ id: "parent" });
      connectModelToYJS(parent, root);
      applySet(
        parent.childStore,
        "test-child",
        new TestChild({ id: "test-child" }),
      );
      doc.transact(() => {
        (root.get("childStore") as Y.Map<any>).delete("test-child");
      }, "override-local");

      assert.isUndefined(root.toJSON().childStore["test-child"]);
    });
  });

  describe("Arrays", () => {
    test("Refuses arrays that aren't arrayes of refs", () => {
      @model("ef/IllegalArray")
      class IllegalArray extends Model({
        illegalArray: tProp(types.array(types.number), () => []),
      }) {}
      const doc = new Y.Doc();
      const root = doc.getMap("root");

      const parent = new IllegalArray({});
      assert.throws(() => {
        connectModelToYJS(parent, root);
      }, "keystone array types ONLY supported as arrays of refs.");
    });

    test("Loads initial snapshot from YJS", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");
      root.set("id", "parent");
      root.set("$modelType", "ef/Parent");
      root.set(
        "childStore",
        new Y.Map([
          [
            "test-child",
            new Y.Map([
              ["$modelType", "ef/Child"],
              ["id", "test-child"],
              ["data", KVFromEntries([["title", "Child Title"]])],
            ]),
          ],
        ]),
      );
      const childRefArray = root.set("childRefs", new Y.Array<any>());
      childRefArray.push([{ id: "test-child", $modelType: "ChildRef" }]);

      const parent = new TestParent({ id: "parent" });

      connectModelToYJS(parent, root);
      expect(getSnapshot(parent.childRefs)).toEqual([
        { id: "test-child", $modelType: "ChildRef" },
      ]);
    });

    test("Syncs additions from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");
      root.set("id", "parent");
      root.set("$modelType", "ef/Parent");
      root.set(
        "childStore",
        new Y.Map([
          [
            "test-child",
            new Y.Map([
              ["$modelType", "ef/Child"],
              ["id", "test-child"],
              ["data", KVFromEntries([["title", "Child Title"]])],
            ]),
          ],
        ]),
      );
      const childRefArray = root.set("childRefs", new Y.Array<any>());
      childRefArray.push([{ id: "test-child", $modelType: "ChildRef" }]);

      const parent = new TestParent({ id: "parent" });

      connectModelToYJS(parent, root);

      doc.transact(() => {
        (root.get("childStore") as Y.Map<any>).set(
          "test-child-2",
          new Y.Map([
            ["$modelType", "ef/Child"],
            ["id", "test-child-2"],
            ["data", KVFromEntries([["title", "Child Title 2"]])],
          ]),
        );
        childRefArray.push([{ id: "test-child-2", $modelType: "ChildRef" }]);
      }, "override-local");

      expect(getSnapshot(parent.childRefs)).toEqual([
        { id: "test-child", $modelType: "ChildRef" },
        { id: "test-child-2", $modelType: "ChildRef" },
      ]);
    });

    test("syncs deletes from YJS to Keystone model", () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");
      root.set("id", "parent");
      root.set("$modelType", "ef/Parent");
      root.set(
        "childStore",
        new Y.Map([
          [
            "test-child",
            new Y.Map([
              ["$modelType", "ef/Child"],
              ["id", "test-child"],
              ["data", KVFromEntries([["title", "Child Title"]])],
            ]),
          ],
        ]),
      );
      const childRefArray = root.set("childRefs", new Y.Array<any>());
      childRefArray.push([{ id: "test-child", $modelType: "ChildRef" }]);

      const parent = new TestParent({ id: "parent" });

      connectModelToYJS(parent, root);

      doc.transact(() => {
        (root.get("childStore") as Y.Map<any>).delete("test-child");
        childRefArray.delete(0);
      }, "override-local");

      expect(parent.childRefs).toEqual([]);
    });

    test("syncs deletes from Keystone model to YJS", async () => {
      const doc = new Y.Doc();
      const root = doc.getMap("root");
      root.set("id", "parent");
      root.set("$modelType", "ef/Parent");
      root.set(
        "childStore",
        new Y.Map([
          [
            "test-child",
            new Y.Map([
              ["$modelType", "ef/Child"],
              ["id", "test-child"],
              ["data", KVFromEntries([["title", "Child Title"]])],
            ]),
          ],
        ]),
      );
      const childRefArray = root.set("childRefs", new Y.Array<any>());
      childRefArray.push([{ id: "test-child", $modelType: "ChildRef" }]);

      const parent = new TestParent({ id: "parent" });

      connectModelToYJS(parent, root);

      arrayActions.pop(parent.childRefs);

      expect(childRefArray.toArray()).toEqual([]);
    });
  });

  test("rejects ors with non-simple types", () => {
    @model("ef/WithOr")
    class WithOr extends Model(
      {
        id: idProp,
        or: tProp(
          types.or(types.array(types.number), types.undefined),
        ).withSetter(),
      },
      yjsAdapterSnapshotProcessor,
    ) {}
    const doc = new Y.Doc();
    const root = doc.getMap("root");

    const parent = new WithOr({ id: "parent" });
    assert.throws(() => {
      connectModelToYJS(parent, root);
    }, /Or types with non-simple types not supported./);
  });

  test("rejects untyped propeties in models", () => {
    @model("ef/WithUntyped")
    class WithUntyped extends Model(
      {
        id: idProp,
        typed: tProp(types.string, "default").withSetter(),
        untyped: prop<string>().withSetter(),
      },
      yjsAdapterSnapshotProcessor,
    ) {}
    const doc = new Y.Doc();
    const root = doc.getMap("root");

    const untyped = new WithUntyped({ id: "parent", untyped: "somestring" });
    assert.throws(() => {
      connectModelToYJS(untyped, root);
    }, /Unhandled type: untyped is type UncheckedTypeInfo/);
  });

  test("rejects models with no typed properties", () => {
    @model("ef/WithUntyped")
    class WithUntyped extends Model(
      {
        id: idProp,
        untyped: prop<string>("default").withSetter(),
      },
      yjsAdapterSnapshotProcessor,
    ) {}
    const doc = new Y.Doc();
    const root = doc.getMap("root");

    const untyped = new WithUntyped({ id: "parent", untyped: "somestring" });
    assert.throws(() => {
      connectModelToYJS(untyped, root);
    }, /Unexpected typeInfo type: LiteralTypeInfo/);
  });

  test("syncs enumeration types", () => {
    enum SampleEnum {
      A = "A",
      B = "B",
    }

    @model("ef/WithEnum")
    class WithEnum extends Model(
      {
        id: idProp,
        enum: tProp(types.enum(SampleEnum), SampleEnum.A).withSetter(),
      },
      yjsAdapterSnapshotProcessor,
    ) {}

    assertModelsSync(new WithEnum({ id: "enum" }), (left, right) => {
      left.setEnum(SampleEnum.B);
      assert.equal(left.enum, SampleEnum.B);
      assert.equal(right.enum, SampleEnum.B);

      right.setEnum(SampleEnum.A);
      assert.equal(left.enum, SampleEnum.A);
      assert.equal(right.enum, SampleEnum.A);
    });
  });
});
