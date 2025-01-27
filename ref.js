import fs from 'fs/promises';
import { Wallet } from "ethers";
import chalk from "chalk";
import readline from 'readline';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from "axios";
import banner from './utils/banner.js';

// Enhanced Modern Logger
const logger = {
    _formatTimestamp() {
        return chalk.gray(`[${new Date().toLocaleTimeString()}]`);
    },

    _getLevelStyle(level) {
        const styles = {
            info: chalk.blueBright.bold,
            warn: chalk.yellowBright.bold,
            error: chalk.redBright.bold,
            success: chalk.greenBright.bold,
            debug: chalk.magentaBright.bold
        };
        return styles[level] || chalk.white;
    },

    log(level, message, value = '') {
        const timestamp = this._formatTimestamp();
        const levelStyle = this._getLevelStyle(level);
        const levelTag = levelStyle(`[${level.toUpperCase()}]`);

        const header = chalk.cyan('◆ LayerEdge Auto Bot');
        const formattedMessage = `${header} ${timestamp} ${levelTag} ${message}`;

        let formattedValue = '';
        if (value) {
            switch(level) {
                case 'error':
                    formattedValue = chalk.red(` ✘ ${value}`);
                    break;
                case 'warn':
                    formattedValue = chalk.yellow(` ⚠ ${value}`);
                    break;
                case 'success':
                    formattedValue = chalk.green(` ✔ ${value}`);
                    break;
                default:
                    formattedValue = chalk.green(` ➤ ${value}`);
            }
        }

        console.log(`${formattedMessage}${formattedValue}`);
    },

    info: (message, value = '') => logger.log('info', message, value),
    warn: (message, value = '') => logger.log('warn', message, value),
    error: (message, value = '') => logger.log('error', message, value),
    success: (message, value = '') => logger.log('success', message, value),
    debug: (message, value = '') => logger.log('debug', message, value),

    progress(step, status) {
        const progressStyle = status === 'success' 
            ? chalk.green('✔') 
            : status === 'failed' 
            ? chalk.red('✘') 
            : chalk.yellow('➤');
        
        console.log(
            chalk.cyan('◆ LayerEdge Auto Bot'),
            chalk.gray(`[${new Date().toLocaleTimeString()}]`),
            chalk.blueBright(`[PROGRESS]`),
            `${progressStyle} ${step}`
        );
    }
};

// Helper Functions
async function readFile(pathFile) {
    try {
        const datas = await fs.readFile(pathFile, 'utf8');
        return datas.split('\n')
            .map(data => data.trim())
            .filter(data => data.length > 0);
    } catch (error) {
        logger.error(`Error reading file: ${error.message}`);
        return [];
    }
}

const newAgent = (proxy = null) => {
    if (proxy) {
        if (proxy.startsWith('http://')) {
            return new HttpsProxyAgent(proxy);
        } else if (proxy.startsWith('socks4://') || proxy.startsWith('socks5://')) {
            return new SocksProxyAgent(proxy);
        } else {
            logger.warn(`Unsupported proxy type: ${proxy}`);
            return null;
        }
    }
    return null;
};

function createNewWallet() {
    const wallet = Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
    };
}

async function saveWalletToFile(walletDetails) {
    try {
        let wallets = [];
        try {
            const data = await fs.readFile("wallets.json", "utf8");
            wallets = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }

        wallets.push(walletDetails);
        await fs.writeFile("wallets.json", JSON.stringify(wallets, null, 2));
        logger.success("Wallet saved successfully", walletDetails.address);
    } catch (err) {
        logger.error("Failed to save wallet", err.message);
    }
}

async function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(chalk.cyan(`◆ ${question}`), (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// LayerEdge Connection Class
class LayerEdgeConnection {
    constructor(proxy = null, privateKey = null, refCode) {
        this.refCode = refCode;
        this.proxy = proxy;

        this.axiosConfig = {
            ...(this.proxy && { httpsAgent: newAgent(this.proxy) }),
            timeout: 60000,
        };

        this.wallet = privateKey
            ? new Wallet(privateKey)
            : Wallet.createRandom();
    }

    async makeRequest(method, url, config = {}, retries = 30) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios({
                    method,
                    url,
                    ...this.axiosConfig,
                    ...config,
                });
                return response;
            } catch (error) {
                if (i === retries - 1) {
                    logger.error(`Max retries reached - Request failed:`, error.message);
                    if (this.proxy) {
                        logger.error(`Failed proxy: ${this.proxy}`, error.message);
                    }
                    return null;
                }

                process.stdout.write(chalk.yellow(`request failed: ${error.message} => Retrying... (${i + 1}/${retries})\r`));
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
        return null;
    }

    async checkInvite() {
        const inviteData = {
            invite_code: this.refCode,
        };

        const response = await this.makeRequest(
            "post",
            "https://referralapi.layeredge.io/api/referral/verify-referral-code",
            { data: inviteData }
        );

        if (response && response.data && response.data.data.valid === true) {
            logger.success("Invite code verification successful", this.refCode);
            return true;
        } else {
            logger.error("Failed to verify invite code", this.refCode);
            return false;
        }
    }

    async registerWallet() {
        const registerData = {
            walletAddress: this.wallet.address,
        };

        const response = await this.makeRequest(
            "post",
            `https://referralapi.layeredge.io/api/referral/register-wallet/${this.refCode}`,
            { data: registerData }
        );

        if (response && response.data) {
            logger.success("Wallet registration successful", this.wallet.address);
            return true;
        } else {
            logger.error("Failed to register wallet", this.wallet.address);
            return false;
        }
    }
}

// Main Application
async function autoRegister() {
    console.log(banner);
    logger.info('Starting LayerEdge Auto Registration Bot', 'Initializing...');
    
    const proxies = await readFile('proxy.txt');
    if (proxies.length === 0) {
        logger.warn('No proxies found', 'Running without proxy support');
    }

    const numberOfWallets = parseInt(await askQuestion("How many wallets/ref do you want to create? "));
    if (isNaN(numberOfWallets) || numberOfWallets <= 0) {
        logger.error('Invalid number of wallets specified');
        return;
    }

    const refCode = await askQuestion("Enter your referral code (example: knYyWnsE): ");
    if (!refCode) {
        logger.error('Referral code is required');
        return;
    }

    logger.info('Starting wallet creation and registration', `Target: ${numberOfWallets} wallets`);

    for (let i = 0; i < numberOfWallets; i++) {
        const proxy = proxies[i % proxies.length] || null;
        try {
            logger.progress(`Creating wallet ${i + 1}/${numberOfWallets}`, 'processing');
            
            const walletDetails = createNewWallet();
            logger.info(`New wallet created`, walletDetails.address);

            const connection = new LayerEdgeConnection(proxy, walletDetails.privateKey, refCode);
            
            logger.progress(`Verifying invite code`, 'processing');
            const isValid = await connection.checkInvite();
            if (!isValid) continue;

            logger.progress(`Registering wallet`, 'processing');
            const isRegistered = await connection.registerWallet();
            if (isRegistered) {
                await saveWalletToFile(walletDetails);
                logger.progress(`Wallet ${i + 1} processing complete`, 'success');
            } else {
                logger.progress(`Wallet ${i + 1} registration failed`, 'failed');
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            logger.error(`Failed to process wallet ${i + 1}`, error.message);
        }
    }

    logger.success('Auto registration complete', `Created ${numberOfWallets} wallets`);
}

autoRegister();