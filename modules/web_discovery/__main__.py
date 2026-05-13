"""
Web Discovery Agent - AI-Powered DOM Exploration & Script Generation
======================================================================

A two-phase system:
1. DISCOVERY: Explore web apps, extract DOM elements, build element profiles
2. GENERATION: Use stored profiles to generate automation scripts

Usage:
    python -m web_discovery discover --url https://gmail.com --name gmail
    python -m web_discovery generate --profile gmail --prompt "Extract all emails and mark as read"
    python -m web_discovery chat --profile gmail
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


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
    
    # Import and run
    from web_discovery.cli import WebDiscoveryCLI
    
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
