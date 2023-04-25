require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

import { HardhatUserConfig } from "hardhat/config";
import '@nomiclabs/hardhat-ethers'

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if(!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

/** @type import('hardhat/config').HardhatUserConfig */
const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: "10000000000000000000000",
      },
    },
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: [PRIVATE_KEY],
      chainId: 44787
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
};

export default config;
