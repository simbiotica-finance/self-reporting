const fs = require("fs");
const { task, types } = require("hardhat/config");
const getFromEvents = require("./utils/getFromEvents");

interface ActionParams {
  title: string;
  formid?: number;
  required?: boolean;
  responseType?: number;
  contract: string;
  address?: string;
  description: string;
  skipdependencycheck?: boolean;
}

interface ActionReturn {
  [key: string]: any;
}

interface TaskConfig {
  name: string;
  contract?: string;
  formid?: number;
  title?: string;
  description?: string;
  responseType?: number;
  required?: number;
}

task("deploy", "Deploy the contract")
  .addFlag("skipdependencycheck", "Skip dependency check")
  .setAction(async ({ skipdependencycheck }: any, hre: any): Promise<ActionReturn> => {
    if (!skipdependencycheck && !hre.dependencies.hasOwnProperty("contract")) {
      throw new Error("Missing dependency: contract");
    }

    const accounts = await hre.web3.eth.getAccounts();

    const OnChainForms = await hre.ethers.getContractFactory("OnChainForms", accounts[0]);

    const deploy = await OnChainForms.deploy();

    await deploy.deployed();

    console.log("OnChainForms deployed to:", deploy.address);

    return {
      contract: deploy.address,
    };
  });

task("add-form", "Create a form")
  .addFlag("skipdependencycheck", "Skip dependency check")
  .addParam("contract", "The form address.")
  .addParam("title", "Create a title for the form", "Default Title")
  .addParam("description", "Create a description for the form", "Default Description")
  .setAction(async ({ contract, title, description, skipdependencycheck }: ActionParams, hre: any): Promise<ActionReturn> => {
    if (!skipdependencycheck && !hre.dependencies.hasOwnProperty("contract")) {
      throw new Error("Missing dependency: contract");
    }

    const OnChainForms = await hre.ethers.getContractAt("OnChainForms", contract);

    const tx = await OnChainForms.createForm(title, description, {
      gasLimit: 1000000,
      gasPrice: 100000000000,
    });

    const { formid } = await getFromEvents(tx, "FormCreated");

    console.log("New form:", formid);

    return {
      formid: formid.toNumber(),
    };
  });

task("add-question", "Create a question on a form")
  .addFlag("skipdependencycheck", "Skip dependency check")
  .addParam("contract", "The form address.", undefined, types.string)
  .addParam("formid", "The form id.", undefined, types.int)
  .addParam("title", "Create a title for the form", "Default Question Title")
  .addParam("responseType", "What type of response is required?", undefined, types.int)
  .addParam("required", "Is the question required?", false, types.boolean)
  .addParam("description", "Create a description for the form", "Default Question Description", types.string)
  .setAction(async ({ formid, title, contract, description, required, responseType, skipdependencycheck }: ActionParams, hre: any): Promise<ActionReturn> => {
    if (!skipdependencycheck && !hre.dependencies.hasOwnProperty("contract")) {
      throw new Error("Missing dependency: contract");
    }

    const OnChainForms = await hre.ethers.getContractAt("OnChainForms", contract);

    const tx = await OnChainForms.addQuestionToForm(formid, title, description, required, responseType, {
      gasLimit: 1000000,
      gasPrice: 100000000000,
    });

    const { questionIndex } = await getFromEvents(tx, "QuestionCreated");

    console.log("New question:", questionIndex);

    return {
      questionIndex: questionIndex.toNumber(),
    };
  });

task("add-responder", "Add a responder to a form")
  .addFlag("skipdependencycheck", "Skip dependency check")
  .addParam("contract", "The form address.", undefined, types.string)
  .addParam("formid", "The form id.", undefined, types.int)
  .addParam("address", "The address of the responder.", undefined, types.string)
  .setAction(async ({ formid, address, contract, skipdependencycheck }: ActionParams, hre: any): Promise<ActionReturn> => {
    if (!skipdependencycheck && !hre.dependencies.hasOwnProperty("contract")) {
      throw new Error("Missing dependency: contract");
    }

    const OnChainForms = await hre.ethers.getContractAt("OnChainForms", contract);

    const tx = await OnChainForms.addResponder(formid, address, {
      gasLimit: 1000000,
      gasPrice: 100000000000,
    })

    const { responder } = await getFromEvents(tx, "ResponderAdded");

    console.log("New responder added:", formid, responder);

    return {
      formid: formid,
      responder: responder,
    };
  });

task("process-json", "Process tasks from JSON file")
  .addParam("json", "Path to the JSON file")
  .setAction(async ({ json }: any, hre: any) => {
    const jsonContent = fs.readFileSync(json, "utf8");
    const tasks: TaskConfig[] = JSON.parse(jsonContent);

    const results: ActionReturn = {};

    for (const taskConfig of tasks) {
      const { name, ...params } = taskConfig;

      try {
        const result = await hre.run(name, { ...params, skipdependencycheck: true, ...results });
        Object.assign(results, result);
      } catch (error) {
        const { message } = error as Error;
        console.error(`Error executing task '${name}': ${message}`);
      }
    }

    console.log("Results:", results);
  });
