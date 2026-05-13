"""
Web Discovery CLI - Main entry point for the agent
"""

import argparse
import asyncio
import sys
from pathlib import Path

from web_discovery.core.browser_agent import BrowserDiscoveryAgent
from web_discovery.core.gemma_client import GemmaClient
from web_discovery.core.element_profiler import ElementProfiler
from web_discovery.core.script_generator import ScriptGenerator
from web_discovery.core.profile_manager import ProfileManager


class WebDiscoveryCLI:
    """Main CLI for the Web Discovery Agent"""
    
    def __init__(self, base_dir: str = None):
        self.base_dir = Path(base_dir or Path(__file__).parent.parent)
        self.profiles_dir = self.base_dir / "profiles"
        self.scripts_dir = self.base_dir / "generated_scripts"
        self.cache_dir = self.base_dir / "cache"
        
        # Ensure directories exist
        for d in [self.profiles_dir, self.scripts_dir, self.cache_dir]:
            d.mkdir(parents=True, exist_ok=True)
    
    async def discover(
        self,
        url: str,
        name: str,
        max_pages: int = 20,
        max_depth: int = 5,
        headless: bool = True
    ):
        """Phase 1: Discover and profile a web application"""
        print(f"\n🔍 Starting discovery of: {url}")
        print(f"📁 Profile name: {name}")
        print(f"📄 Max pages: {max_pages}, Max depth: {max_depth}")
        print("=" * 60)
        
        # Initialize components
        gemma = GemmaClient()
        agent = BrowserDiscoveryAgent(headless=headless)
        profiler = ElementProfiler(gemma_client=gemma)
        manager = ProfileManager(self.profiles_dir)
        
        try:
            # Start browser and begin discovery
            await agent.start()
            
            # Explore pages iteratively
            discovered_elements = []
            page_manifest = []
            
            pages_to_visit = [(url, 0)]  # (url, depth)
            visited = set()
            
            while pages_to_visit and len(page_manifest) < max_pages:
                current_url, depth = pages_to_visit.pop(0)
                
                if current_url in visited or depth > max_depth:
                    continue
                
                visited.add(current_url)
                print(f"\n🌐 Exploring: {current_url} (depth: {depth})")
                
                # Navigate and extract DOM
                await agent.navigate(current_url)
                await asyncio.sleep(2)  # Wait for page load
                
                # Extract all elements
                elements = await agent.extract_all_elements()
                
                # Profile each element with Gemma
                print(f"   Found {len(elements)} elements, profiling with Gemma...")
                profiled_elements = await profiler.profile_elements(elements)
                
                discovered_elements.extend(profiled_elements)
                
                # Find links to other pages
                links = await agent.find_page_links()
                for link in links:
                    if link not in visited:
                        pages_to_visit.append((link, depth + 1))
                
                # Record page
                page_info = {
                    "url": current_url,
                    "depth": depth,
                    "element_count": len(elements),
                    "discovered_at": str(asyncio.get_event_loop().time())
                }
                page_manifest.append(page_info)
                
                print(f"   ✓ Total elements so far: {len(discovered_elements)}")
            
            # Save profile
            profile_data = {
                "name": name,
                "url": url,
                "discovered_at": str(asyncio.get_event_loop().time()),
                "total_elements": len(discovered_elements),
                "pages": page_manifest,
                "elements": discovered_elements
            }
            
            await manager.save_profile(name, profile_data)
            
            print(f"\n✅ Discovery complete!")
            print(f"   📊 Total elements: {len(discovered_elements)}")
            print(f"   📄 Pages explored: {len(page_manifest)}")
            print(f"   💾 Profile saved: {self.profiles_dir / name}.json")
            
        finally:
            await agent.stop()
            await gemma.close()
    
    async def generate(
        self,
        profile: str,
        prompt: str,
        output_format: str = "selenium",
        framework: str = "playwright"
    ):
        """Phase 2: Generate automation script from profile"""
        print(f"\n🤖 Generating script from profile: {profile}")
        print(f"📝 Task: {prompt}")
        print(f"🎯 Framework: {framework}")
        print("=" * 60)
        
        # Load profile
        manager = ProfileManager(self.profiles_dir)
        profile_data = await manager.load_profile(profile)
        
        if not profile_data:
            print(f"❌ Profile '{profile}' not found!")
            return
        
        # Initialize Gemma for script generation
        gemma = GemmaClient()
        generator = ScriptGenerator(gemma_client=gemma, framework=framework)
        
        try:
            # Generate script
            script = await generator.generate(
                profile_data=profile_data,
                user_prompt=prompt
            )
            
            # Save script
            output_path = self.scripts_dir / f"{profile}_{framework}_{int(asyncio.get_event_loop().time())}.py"
            await generator.save_script(script, output_path)
            
            print(f"\n✅ Script generated!")
            print(f"   📄 Saved to: {output_path}")
            print(f"\n📜 Generated Script Preview:")
            print("-" * 60)
            print(script[:1000] + "..." if len(script) > 1000 else script)
            print("-" * 60)
            
        finally:
            await gemma.close()
    
    async def chat(self, profile: str):
        """Interactive chat mode with a profiled web app"""
        print(f"\n💬 Interactive chat mode for: {profile}")
        print("   Type your automation tasks in natural language")
        print("   Type 'exit' to quit")
        print("=" * 60)
        
        manager = ProfileManager(self.profiles_dir)
        profile_data = await manager.load_profile(profile)
        
        if not profile_data:
            print(f"❌ Profile '{profile}' not found!")
            return
        
        gemma = GemmaClient()
        generator = ScriptGenerator(gemma_client=gemma)
        
        try:
            while True:
                try:
                    prompt = input("\n🗣️ Your task: ").strip()
                    
                    if prompt.lower() in ['exit', 'quit', 'q']:
                        print("👋 Goodbye!")
                        break
                    
                    if not prompt:
                        continue
                    
                    print("🤔 Generating...")
                    script = await generator.generate(profile_data, prompt)
                    
                    print(f"\n✅ Generated script:")
                    print("-" * 40)
                    print(script[:800] + "..." if len(script) > 800 else script)
                    print("-" * 40)
                    
                    # Ask if user wants to save
                    save = input("\n💾 Save this script? (y/n): ").strip().lower()
                    if save == 'y':
                        output_path = self.scripts_dir / f"{profile}_script_{int(asyncio.get_event_loop().time())}.py"
                        await generator.save_script(script, output_path)
                        print(f"   Saved to: {output_path}")
                        
                except KeyboardInterrupt:
                    print("\n👋 Goodbye!")
                    break
        
        finally:
            await gemma.close()
    
    def list_profiles(self):
        """List all discovered profiles"""
        manager = ProfileManager(self.profiles_dir)
        profiles = manager.list_profiles()
        
        if not profiles:
            print("📭 No profiles found. Run discovery first!")
            return
        
        print("\n📋 Discovered Profiles:")
        print("-" * 50)
        for p in profiles:
            print(f"   • {p['name']}")
            print(f"     URL: {p['url']}")
            print(f"     Elements: {p['element_count']}")
            print(f"     Pages: {p['page_count']}")
            print()
    
    def view_profile(self, name: str):
        """View details of a profile"""
        manager = ProfileManager(self.profiles_dir)
        profile = manager.load_profile(name)
        
        if not profile:
            print(f"❌ Profile '{name}' not found!")
            return
        
        print(f"\n📊 Profile: {name}")
        print("=" * 50)
        print(f"URL: {profile['url']}")
        print(f"Discovered: {profile['discovered_at']}")
        print(f"Total Elements: {profile['total_elements']}")
        print(f"Pages: {len(profile['pages'])}")
        
        print("\n🔍 Element Sample (first 10):")
        print("-" * 50)
        for elem in profile['elements'][:10]:
            print(f"\n   Tag: {elem.get('tag', 'N/A')}")
            print(f"   Purpose: {elem.get('purpose', 'N/A')}")
            print(f"   Selector: {elem.get('selector', {}).get('css', 'N/A')}")
            print(f"   XPath: {elem.get('selector', {}).get('xpath', 'N/A')}")


def main():
    parser = argparse.ArgumentParser(
        description="Web Discovery Agent - AI-Powered DOM Exploration & Script Generation"
    )
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Discovery command
    discover_parser = subparsers.add_parser('discover', help='Discover a web application')
    discover_parser.add_argument('--url', required=True, help='URL to discover')
    discover_parser.add_argument('--name', required=True, help='Profile name')
    discover_parser.add_argument('--max-pages', type=int, default=20, help='Max pages to explore')
    discover_parser.add_argument('--max-depth', type=int, default=5, help='Max link depth')
    discover_parser.add_argument('--visible', action='store_true', help='Show browser')
    
    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate automation script')
    generate_parser.add_argument('--profile', required=True, help='Profile name')
    generate_parser.add_argument('--prompt', required=True, help='Task description')
    generate_parser.add_argument('--framework', default='playwright', choices=['selenium', 'playwright'], help='Framework')
    
    # Chat command
    chat_parser = subparsers.add_parser('chat', help='Interactive chat mode')
    chat_parser.add_argument('--profile', required=True, help='Profile name')
    
    # List command
    subparsers.add_parser('list', help='List all profiles')
    
    # View command
    view_parser = subparsers.add_parser('view', help='View profile details')
    view_parser.add_argument('--name', required=True, help='Profile name')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = WebDiscoveryCLI()
    
    if args.command == 'discover':
        asyncio.run(cli.discover(
            url=args.url,
            name=args.name,
            max_pages=args.max_pages,
            max_depth=args.max_depth,
            headless=not args.visible
        ))
    elif args.command == 'generate':
        asyncio.run(cli.generate(
            profile=args.profile,
            prompt=args.prompt,
            framework=args.framework
        ))
    elif args.command == 'chat':
        asyncio.run(cli.chat(profile=args.profile))
    elif args.command == 'list':
        cli.list_profiles()
    elif args.command == 'view':
        cli.view_profile(name=args.name)


if __name__ == "__main__":
    main()