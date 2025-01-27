# Layer Edge Auto Bot

Website: https://dashboard.layeredge.io/

## Features

- **Auto Node Management**
  - Automatic node starting/stopping
  - Point claiming optimization
  - Continuous status monitoring
- **Smart Proxy Support**
  - Optional HTTP proxy support
  - Automatic proxy testing and selection
  - Can run with or without proxies
- **Advanced Point System**
  - Real-time point monitoring
  - Automatic claim cycles
  - Optimized claim timing
- **Dynamic Intervals**
  - 25 minutes cycle
  - 34 minutes cycle
  - 1.5 hours cycle (rotates automatically)

## Prerequisites

- Node.js 18 or higher
- NPM or Yarn package manager

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/airdropinsiders/LayerEdge-Auto-Bot.git
    cd LayerEdge-Auto-Bot
    ```

2. Install dependencies:
    ```sh
    npm install
    # or
    yarn install
    ```

3. Configure your wallets in `wallets.json`:
    ```json
    [
        {
            "address": "your_wallet_address",
            "privateKey": "your_private_key"
        }
    ]
    ```

4. (Optional) Add proxies in `https.txt`:
    ```plaintext
    ip:port
    ip:port
    ```
    Note: Bot will run without proxies if none are configured

5. Start the bot:
    ```sh
    npm run dev
    # or
    yarn dev
    ```

## Operation Modes

1. **With Proxy**
   - Place HTTP proxies in https.txt
   - Bot automatically tests and selects working proxy
   - Continues operation with proxy support

2. **Without Proxy**
   - No proxy configuration needed
   - Bot automatically runs in direct connection mode
   - All features remain functional

## Error Handling

- Automatic retry on failed requests
- Proxy failover support
- Continuous operation despite temporary errors

## Monitoring

- Real-time point updates
- Connection status monitoring
- Detailed operation logs
- Progress tracking for each wallet

## License

This project is licensed under the [MIT License](LICENSE).
