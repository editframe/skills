import { PersistentTab, PersistentTabGroup } from "../PersistentTabGroup";

export const ResourceOperation = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="text-sm font-mono font-medium text-gray-700">
      <PersistentTabGroup stateKey="resourceOperation">
        {children}
      </PersistentTabGroup>
    </div>
  );
};

export const ResourceOperationMethod = ({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "http" | "typescript";
}) => {
  return <PersistentTab label={type}>{children}</PersistentTab>;
};
