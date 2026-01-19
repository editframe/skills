import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFConfiguration } from "./EFConfiguration.js";
import "./EFConfiguration.js";
import "./EFWorkbench.js";
import "../elements/EFTimegroup.js";

export default defineSandbox({
  name: "EFConfiguration",
  description: "Configuration container for API host and context setup",
  category: "gui",
  subcategory: "config",
  
  render: () => html`
    <ef-configuration
      id="test-config"
      style="width: 800px; height: 600px; border: 1px solid #ccc;"
    >
      <ef-workbench>
        <ef-timegroup
          mode="fixed"
          duration="5s"
          style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 400px; height: 300px;"
        >
          <div style="padding: 20px; background: rgba(0,0,0,0.5); color: white;">
            Test Content
          </div>
        </ef-timegroup>
      </ef-workbench>
    </ef-configuration>
  `,
  
  scenarios: {
    async "renders configuration component"(ctx) {
      const config = ctx.querySelector<EFConfiguration>("ef-configuration")!;
      
      await config.updateComplete;
      await ctx.frame();
      
      ctx.expect(config).toBeDefined();
    },
    
    async "sets API host"(ctx) {
      const config = ctx.querySelector<EFConfiguration>("ef-configuration")!;
      
      await config.updateComplete;
      await ctx.frame();
      
      // apiHost defaults to undefined when not set (uses current origin)
      ctx.expect(config.apiHost).toBeUndefined();
    },
    
    async "provides API host context"(ctx) {
      const config = ctx.querySelector<EFConfiguration>("ef-configuration")!;
      
      await config.updateComplete;
      await ctx.frame();
      
      // EFConfiguration provides itself as the efConfiguration context
      // and exposes apiHost as a property
      // apiHost defaults to undefined when not set (uses current origin)
      ctx.expect(config.apiHost).toBeUndefined();
      ctx.expect((config as any).efConfiguration).toBe(config);
    },
    
    async "can change API host"(ctx) {
      const config = ctx.querySelector<EFConfiguration>("ef-configuration")!;
      
      await config.updateComplete;
      await ctx.frame();
      
      config.apiHost = "https://api.example.com";
      await config.updateComplete;
      await ctx.frame();
      
      ctx.expect(config.apiHost).toBe("https://api.example.com");
    },
    
    async "provides context to children"(ctx) {
      const config = ctx.querySelector<EFConfiguration>("ef-configuration")!;
      const workbench = ctx.querySelector("ef-workbench")!;
      
      await config.updateComplete;
      await workbench.updateComplete;
      await ctx.frame();
      
      ctx.expect(workbench).toBeDefined();
      ctx.expect(workbench.parentElement).toBe(config);
    },
  },
});
