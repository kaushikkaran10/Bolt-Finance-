import asyncio
from services.ml_service import MLService

async def main():
    try:
        print("Testing ML Service on AAPL...")
        result = await MLService.predict("AAPL")
        print("SUCCESS:", result)
        print("Testing ML Service on TSLA...")
        result2 = await MLService.predict("TSLA")
        print("SUCCESS:", result2)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
