
const fs = require("node:fs");
const { exec } = require("child_process");
const { task, types } = require("hardhat/config");
const getFromEvents = require("./utils/getFromEvents");

interface ActionParams {
  title: string;
  form?: number;
  contract: string;
  description: string;
}

interface ActionReturn {
  title: string;
  contract: string;
}

task("deploy", "Deploy the contract")
   .setAction( async ( _: any, hre: any ) => {
      const accounts = await hre.web3.eth.getAccounts()

      const OnChainForms = await hre.ethers.getContractFactory("OnChainForms", accounts[0]);

      const deploy = await OnChainForms.deploy();

      await deploy.deployed();

      console.log("OnChainForms deployed to:", deploy.address);
  })

task("add-form", "Create a form")
   .addParam("contract", "The form address.")
   .addParam("title", "Create a title for the form", "Default Title")
   .addParam("description", "Create a description for the form", "Default Description")
   .setAction(async ({ title, contract, description}: ActionParams, hre: any): Promise<void> => {

      const OnChainForms = await hre.ethers.getContractAt("OnChainForms", contract);

      const tx = await OnChainForms.createForm(title, description, {
         gasLimit: 100000,
         gasPrice: 100000000000,
      });

      const { formId } = await getFromEvents(tx, "FormCreated");

      console.log("New form:", formId);
   });


task("add-question", "Create a question on a form")
   .addParam("contract", "The form address.", undefined, types.string)
   .addParam("form", "The form id.", undefined, types.int)
   .addParam("title", "Create a title for the form", "Default Question Title", types.string)
   .addParam("responseType", "What type of response is required?", "String", types.string)
   .addParam("required", "Is the question required?", false, types.boolean)
   .addParam("description", "Create a description for the form", "Default Question Description", types.string)
   .setAction(async ({ form, title, contract, description}: ActionParams, hre: any): Promise<void> => {

      const OnChainForms = await hre.ethers.getContractAt("OnChainForms", contract);

      const tx = await OnChainForms.addQuestionToForm(form, title, description, {
         gasLimit: 100000,
         gasPrice: 100000000000,
      });

      const {questionIndex} = await getFromEvents(tx, "QuestionCreated");

      console.log("New question:", questionIndex);
   });