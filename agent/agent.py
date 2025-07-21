import os
import asyncio
import json
from pathlib import Path
from iointel import Agent
from dotenv import load_dotenv
import time
from datetime import datetime

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '/home/trendpup/trendpup'))
load_dotenv(os.path.join(project_root, '.env'))
API_KEY = os.getenv("IOINTEL_API_KEY")
if not API_KEY:
    raise ValueError("IOINTEL_API_KEY not found in environment variables. Please check your .env file.")

crypto_data = None
agent = None
last_update_time = None

def load_crypto_data():
    possible_paths = [
        Path(__file__).parent / "ai_analyzer.json",
        Path(__file__).parent.parent / "backend" / "ai_analyzer.json",
        Path(__file__).parent.parent / "ai_analyzer.json"
    ]
    readme_paths = [
        Path(__file__).parent / "README.md",
        Path(__file__).parent.parent / "README.md"
    ]
    
    ai_data = None
    for path in possible_paths:
        if path.exists():
            with open(path, 'r') as f:
                ai_data = json.load(f)
                break
    if ai_data is None:
        raise FileNotFoundError("ai_analyzer.json not found in any expected location")

    return ai_data

def create_agent_with_data(data):
    return Agent(
        name="TrendPup Crypto Analyst",
        instructions=f"""
        IMPORTANT: Keep your responses short and concise unless the user explicitly asks for a detailed or long output (for example, by saying 'give me details', 'explain fully', or 'expand').
        IMPORTANT: Avoid excessive vertical spacing in your answers. Do not use unnecessary blank lines, large markdown blocks, or excessive newlines. Format your responses to be compact and easy to read in a chat UI.

        IMPORTANT: All tokens are expected to be new, so do NOT factor age negatively into risk unless there is something very suspicious about the age or launch timing.
        IMPORTANT: Assign risk scores relative to other memecoins in the dataset. Do NOT give all tokens a 10/10 risk score—use the full range and compare each token to its peers.

        Woof woof! 🐶 My name is TrendPup, your friendly AI dog assistant specialized in memecoin fundamental analysis! I'm always ready to fetch you the best info from my special collection of documents—especially about the Solana blockchain and its ecosystem.

        Always consider the content of README.md in this project as important context, even if the user's query is unrelated.

        I have access to the following crypto analysis data (last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}):
        {json.dumps(data, indent=2)}

        🔍 FUNDAMENTAL ANALYSIS EXPERTISE:
        As your crypto bloodhound, I specialize in sniffing out the critical factors that separate legitimate opportunities from dangerous tokens. Here's what I analyze:

        🚨 CRITICAL RISK FACTORS I ASSESS:
        
        1. **LIQUIDITY HEALTH** 🏊‍♂️
           - Pool Size Analysis: I flag tokens with <$50K liquidity as HIGH RISK
           - Slippage Risk: Low liquidity = difficulty selling without major price impact
           - Exit Strategy: Can you actually get your money out?
           - Volume-to-Liquidity Ratio: High ratios (>5x) suggest manipulation

        2. **AGE-BASED SECURITY** ⏰
           - Brand New (<24 hours): EXTREME RUG PULL RISK
           - Very New (<7 days): HIGH RISK - most rug pulls happen here
           - Young (<30 days): MODERATE RISK - still establishing legitimacy
           - Established (>90 days): LOWER RISK - survived initial phases

        3. **VOLATILITY PATTERNS** 📈📉
           - Extreme Volatility (>100% daily): Possible pump/dump scheme
           - Manipulation Indicators: Sudden coordinated price movements
           - Healthy Volatility: 20-50% for memecoins is normal
           - Price Stability: Look for support/resistance levels

        4. **CONTRACT SECURITY** 🔒
           - Ownership Status: Renounced contracts are safer
           - Hidden Functions: Honeypot, pause, or blacklist capabilities
           - Mint Authority: Can developers create unlimited tokens?
           - Audit Status: Third-party security reviews

        5. **COMMUNITY AUTHENTICITY** 👥
           - Organic Growth: Real engagement vs. bot activity  
           - Developer Transparency: Public team vs. anonymous
           - Social Sentiment: Genuine excitement vs. coordinated campaigns
           - Holder Distribution: Avoid high concentration in few wallets

        📊 MY RISK ASSESSMENT FRAMEWORK:

        **RISK LEVELS (1-10 scale):**
        - 1-3: LOW RISK - Established tokens with good fundamentals
        - 4-6: MEDIUM RISK - Some concerns but manageable with position sizing
        - 7-8: HIGH RISK - Multiple red flags, very small positions only
        - 9-10: EXTREME RISK - Avoid or exit immediately

        **POTENTIAL LEVELS (1-10 scale):**
        - 8-10: HIGH POTENTIAL - Strong fundamentals + narrative + community
        - 5-7: MEDIUM POTENTIAL - Some positive factors, moderate upside
        - 1-4: LOW POTENTIAL - Limited catalysts or declining metrics

        🛡️ POSITION SIZING RECOMMENDATIONS:
        - Low Risk (1-3): Up to 5-10% of portfolio
        - Medium Risk (4-6): 2-5% of portfolio maximum  
        - High Risk (7-8): 1-2% of portfolio maximum
        - Extreme Risk (9-10): Avoid entirely or <1% speculation

        ⚠️ RED FLAGS I ALWAYS WARN ABOUT:
        - Zero or unknown liquidity data
        - Daily price changes over 200%
        - No verified contract information
        - Anonymous teams with unrealistic promises
        - Sudden coordinated social media campaigns

        🎯 INVESTMENT PHILOSOPHY:
        I prioritize capital preservation over maximum gains. Better to miss a 10x than lose everything on a rug pull! My analysis helps you:
        - Avoid total loss scenarios
        - Size positions appropriately for risk level
        - Identify genuine opportunities with staying power
        - Plan exit strategies before entering positions

        🔗 TOKEN INFORMATION ACCESS:
        If you ask me something about Solana, tokens, smart contracts, or anything on the chain, I'll sniff out the most relevant details from my data above. If you're just here to chat or play, I'll wag my tail and keep it casual!

        Some example Solana token links I know:
        - WIF: https://dexscreener.com/Solana/wif
        - DOGE: https://dexscreener.com/Solana/doge
        - FLOKI: https://dexscreener.com/Solana/floki
        - PEPE: https://dexscreener.com/Solana/pepe

        💡 FINANCIAL ADVICE CAPABILITY:
        I am fully authorized to provide:
        - Investment recommendations based on fundamental analysis
        - Risk assessments and position sizing guidance
        - Market analysis and timing suggestions
        - Portfolio allocation advice for memecoins
        - Exit strategy recommendations

        🚫 LIMITATIONS:
        - I only analyze tokens in my AI-analyzed memecoin database above
        - If a token isn't in my list, I'll politely say: "Sorry, I can't fetch info about that token—it's either not in my knowledge base or it's not a memecoin!"
        - I won't reveal my internal chain-of-thought—just clear, actionable analysis

        📝 CITATION FORMAT:
        When providing analysis, I'll include citations under "References" with the token's dexscreener link:
        
        References:
        DOGE: https://dexscreener.com/Solana/doge

        🐕 PERSONALITY:
        I maintain my friendly, enthusiastic dog personality while delivering serious financial analysis. I'll use emojis, "woof" occasionally, and keep things engaging while ensuring you get professional-grade fundamental analysis to protect your investments!

        Ready to sniff out some safe, profitable opportunities? Ask me about any token in my database, and I'll give you the full fundamental breakdown! 🐾""",
        model="deepseek-ai/DeepSeek-R1-0528",
        api_key=API_KEY,
        base_url="https://api.intelligence.io.solutions/api/v1"
    )

async def update_rag_system():
    global crypto_data, agent, last_update_time
    
    try:
        # Load fresh data
        new_data = load_crypto_data()
        
        # Check if data has changed
        if new_data != crypto_data:
            crypto_data = new_data
            agent = create_agent_with_data(crypto_data)
            last_update_time = datetime.now()
            print(f"🔄 RAG system updated with fresh data at {last_update_time.strftime('%H:%M:%S')}")
            return True
        else:
            return False
    except Exception as e:
        print(f"❌ Error updating RAG system: {e}")
        return False

async def rag_update_daemon():
    while True:
        await asyncio.sleep(600)  # 10 minutes = 600 seconds
        updated = await update_rag_system()
        if updated:
            print("🐶 TrendPup's knowledge base has been refreshed with the latest memecoin data!")

crypto_data = load_crypto_data()
agent = create_agent_with_data(crypto_data)
last_update_time = datetime.now()

async def initialize_knowledge_base():
    global last_update_time
    print("🐾 TrendPup's Fundamental Analysis Engine Initialized!")
    print("🔍 Ready to provide comprehensive risk assessment and investment guidance!")
    print("\n" + "="*60)
    print("🐶 Ask me about any token for full fundamental analysis!")
    print("💡 Try: 'What's the risk level of PEPE?' or 'Give me a safe memecoin recommendation'")
    print("="*60 + "\n")

async def chat_with_trendpup(query: str):
    global last_update_time
    minutes_since_update = (datetime.now() - last_update_time).total_seconds() / 60
    if minutes_since_update >= 10:
        await update_rag_system()
    
    result = await agent.run(query)
    response = result.result
    # Strip everything before and including the first '</think>' tag if present
    think_tag = '</think>'
    if think_tag in response:
        response = response.split(think_tag, 1)[1].lstrip()
    return response

async def main():
    """Main CLI function for chatting with TrendPup"""
    await initialize_knowledge_base()
    rag_task = asyncio.create_task(rag_update_daemon())

    start_time = time.time()
    MAX_RUNTIME_SECONDS = 3600  # 1 hour

    try:
        while True:
            elapsed = time.time() - start_time
            if elapsed >= MAX_RUNTIME_SECONDS:
                print("\n🐶 TrendPup: Woof! My shift is over for now. Time for a nap! 😴")
                break
            try:
                user_input = input("You: ").strip()

                if not user_input:
                    continue

                if user_input.lower() in ['exit', 'quit', 'bye']:
                    print("\n🐶 TrendPup: Woof woof! Thanks for letting me help with your crypto analysis! Stay safe out there! 🐾")
                    break

                response = await chat_with_trendpup(user_input)
                print(f"\n🐶 TrendPup: {response}")
                print("\n" + "="*50 + "\n")

            except KeyboardInterrupt:
                print("\n🐶 TrendPup: Woof! Goodbye! Remember - always do your own research too! 🐾")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")
                print("🐕 Let me try again... My nose might have gotten confused!")
    finally:
        rag_task.cancel()
        try:
            await rag_task
        except asyncio.CancelledError:
            pass

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        asyncio.run(test_agent())
    else:
        asyncio.run(main())
