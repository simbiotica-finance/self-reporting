import { Contract, Wallet} from "ethers";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployContract } from "ethereum-waffle";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("OnChainForms", () => {

  let onChainForms: Contract;
  let owner: SignerWithAddress;
  let others: SignerWithAddress[];

beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    others = signers.slice(1);

    const OnChainForms = await ethers.getContractFactory("OnChainForms");
    onChainForms = await OnChainForms.deploy();
    await onChainForms.deployed();
});

  it("Should deploy successfully", async () => {
    expect(onChainForms.address).to.be.properAddress;
  });

  it("Should create a form successfully", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"];
    await onChainForms.createForm(title, questions);
    const form = await onChainForms.getForm(1);
    expect(form.title).to.equal(title);
    expect(form.questions).to.deep.equal(questions);
  });

  it("Should add responders successfully", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"];
    await onChainForms.createForm(title, questions);

    const responders = others.slice(0, 2).map((wallet) => wallet.address);
    await onChainForms.addResponders(1, responders);

    for (const responder of responders) {
      const isAllowed = await onChainForms.allowedResponders(1, responder);
      expect(isAllowed).to.equal(true);
    }
  });

  it("Should submit a response successfully", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"];
    await onChainForms.createForm(title, questions);

    const responders = others.slice(0, 2).map((wallet) => wallet.address);
    await onChainForms.addResponders(1, responders);

    const [responder] = responders;
    const formIndex = 1;
    const questionIndex = 0;
    const response = "Answer 1";

    await onChainForms.connect(others[0]).submitResponse(formIndex, questionIndex, response);

    const responseHistory = await onChainForms.getResponseHistory(formIndex, responder, questionIndex);
    expect(responseHistory.responseHistory[0]).to.equal(response);
  });

  it("Should not allow unauthorized responders to submit responses", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"];
    await onChainForms.createForm(title, questions);

    const formIndex = 1;
    const questionIndex = 0;
    const response = "Answer 1";

    await expect(onChainForms.connect(others[0]).submitResponse(formIndex, questionIndex, response)).to.be.revertedWith("Not an allowed responder");
  });

  it("Should not allow submitting responses with invalid question index", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"];
    await onChainForms.createForm(title, questions);

    const responders = others.slice(0, 2).map((wallet) => wallet.address);
    await onChainForms.addResponders(1, responders);

    const formIndex = 1;
    const questionIndex = 2;
    const response = "Answer 1";

    await expect(onChainForms.connect(others[0]).submitResponse(formIndex, questionIndex, response)).to.be.revertedWith("Invalid question index")
  });

  it("Should not allow non-owners to create forms", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"]

    await expect(onChainForms.connect(others[0]).createForm(title, questions)).to.be.revertedWith("Caller is not the owner");
  });

  it("Should not allow non-owners to add responders", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"];
    await onChainForms.createForm(title, questions);

    const responders = others.slice(0, 2).map((wallet) => wallet.address);

    await expect(onChainForms.connect(others[0]).addResponders(1, responders)).to.be.revertedWith("Caller is not the owner");
  });

  it("Should get the correct response history and timestamps", async () => {
    const title = "Test Form";
    const questions = ["Question 1", "Question 2"];
    await onChainForms.createForm(title, questions);
    const responders = others.slice(0, 2).map((wallet) => wallet.address);
    await onChainForms.addResponders(1, responders);

    const [responder] = responders;
    const formIndex = 1;
    const questionIndex = 0;
    const response1 = "Answer 1";
    const response2 = "Answer 2";

    await onChainForms.connect(others[0]).submitResponse(formIndex, questionIndex, response1);
    await onChainForms.connect(others[0]).submitResponse(formIndex, questionIndex, response2);

    const responseHistory = await onChainForms.getResponseHistory(formIndex, responder, questionIndex);
    expect(responseHistory.responseHistory).to.deep.equal([response1, response2]);
    expect(responseHistory.timestamps[0]).to.lessThan(responseHistory.timestamps[1]);
  });
});
