
const fs = require("node:fs");
const { exec } = require("child_process");
const { task, types } = require("hardhat/config");



task("deploy", "Deploy the contract")
   .addParam("interval", "Set the interval for all the tokens to be disposed", 30 * 24 * 60 * 60, types.int)
   .setAction( async ( params: { interval: number } , hre: any ) => {
      const accounts = await hre.web3.eth.getAccounts()

      const OnChainForms = await hre.ethers.getContractFactory("OnChainForms", accounts[0]);

      const deploy = await OnChainForms.deploy();

      await deploy.deployed();

      console.log("OnChainForms deployed to:", deploy.address);
  })