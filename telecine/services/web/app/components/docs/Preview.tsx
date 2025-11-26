export const Preview = ({ code }: { code: string }) => {
  return (
    <div className="xl:max-w-none">
      <div className="px-2">
        <div className="flow-root">
          <div className="flex flex-col">
            <div>
              <iframe
                title="Editframe Playground"
                srcDoc={code}
                sandbox="allow-same-origin allow-scripts allow-top-navigation allow-popups allow-pointer-lock allow-forms"
                style={{
                  height: "500px",
                  width: "100%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
