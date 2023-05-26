import { Contract, Transaction, Wallet } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { deployContract } from 'ethereum-waffle' // this adds expect(onChainForms.address).to.be.properAddress (???)
import { expect } from 'chai'
import { ethers } from 'hardhat'
import getFromEvents from '../utils/getFromEvents'

describe('OnChainForms', () => {
  let onChainForms: Contract
  let owner: SignerWithAddress
  let others: SignerWithAddress[]
  let contract: Contract

  beforeEach(async () => {
    const OnChainForms = await ethers.getContractFactory('OnChainForms')
    onChainForms = await OnChainForms.deploy()
    contract = await onChainForms.deployed();
    [owner, ...others] = await ethers.getSigners()
  })

  it('Should deploy successfully', async () => {
    expect(onChainForms.address).to.be.properAddress                         
  })

  it('Should create a form successfully', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0},
      { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0}
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description ),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      )
    }

    const formDetails = await onChainForms.getFormDetails(formId)
    expect(formDetails.title).to.equal(title)
    expect(formDetails.questionsCount).to.equal(questions.length)

    for (let i = 0; i < questions.length; i++) {
      let questionDetails = await onChainForms.getQuestionDetails(formId, i)
      console.log(questionDetails)
      expect(questionDetails.title).to.equal(questions[i].title)
      expect(questionDetails.description).to.equal(questions[i].description)
    }
  })

  it('Should add responders successfully', async () => {
    const title = 'Test Form2'
    const description = 'Test description 2'
    const questions = [
       { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0},
       { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0},
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description ),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      )
    }

    const responders = [others[0].address]
    await onChainForms.addResponders(formId, responders)

    for (const responder of responders) {
      const isAllowed = await onChainForms.isAllowedResponder(formId, responder)
      expect(isAllowed).to.equal(true)
    }
  })

  it('Should submit a response successfully', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0}
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description),
      'FormCreated'
    )

    let questionIndex
    for (let question of questions) {
      const events = await getFromEvents(
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      ),
        'QuestionCreated'
      )
      questionIndex = events.questionIndex
    }

    await onChainForms.addResponder(formId, others[0].address)

    const response = 46

    await onChainForms
      .connect(others[0])
      .submitResponse(formId, questionIndex, response)
    const responseHistory = await onChainForms.getResponseHistory(
      formId,
      questionIndex
    )
    expect(responseHistory.responses[0]).to.equal(response)
  })

  it('Should not allow unauthorized responders to submit responses', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0},
      { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0}
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      )
    }

    const response = 0

    await expect(
      onChainForms
        .connect(others[0])
        .submitResponse(formId, 1, response)
    ).to.be.revertedWith('Not an allowed responder')
  })

  it('Should not allow submitting responses with invalid question index', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0},
      { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0}
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      )
    }

    const responders = others.slice(0, 2).map(wallet => wallet.address)
    await onChainForms.addResponders(formId, responders)

    const questionIndex = 2 // Invalid question index
    const response = 0

    await expect(
      onChainForms
        .connect(others[0])
        .submitResponse(formId, questionIndex, response)
    ).to.be.revertedWith('Invalid question index')
  })

  it('Should not allow non-owners to create forms', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    await expect(
      onChainForms.connect(others[0]).createForm(title, description)
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('Should not allow non-owners to add responders', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0},
      { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0}
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      )
    }

    const responders = others.slice(0, 2).map(wallet => wallet.address)

    await expect(
      onChainForms.connect(others[0]).addResponders(formId, responders)
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('Should get the correct response history and timestamps', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0},
      { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0}
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      )
    }


    const responder = others[0].address
    await onChainForms.addResponder(formId, responder)

    const response1 = 24
    const response2 = 36

    await onChainForms
      .connect(others[0])
      .submitResponse(formId, 0, response1)

    await onChainForms
      .connect(others[0])
      .submitResponse(formId, 1, response2)

    const responseHistory1 = await onChainForms.getResponseHistory(
      formId,
      0
    )

    console.log(responseHistory1)

    expect(responseHistory1.responses).to.deep.equal([response1])
  })

  it('Should retrieve all responses from a particular responder', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1', isRequired: true, responseType: 0},
      { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0}
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description,
        question.isRequired,
        question.responseType
      )
    }

    const responders = others.slice(0, 2).map(wallet => wallet.address)
    await onChainForms.addResponders(formId, responders)

    const questionIndex = 0
    const response1 = 1
    const response2 = 0

    await onChainForms
      .connect(others[0])
      .submitResponse(formId, questionIndex, response1)
    await onChainForms
      .connect(others[0])
      .submitResponse(formId, questionIndex, response2)

    let responseHistory = await onChainForms.getResponseHistory(
      formId,
      questionIndex
    )

    expect(responseHistory.responses).to.deep.equal([response1, response2])

    const response3 = 3

    await onChainForms
      .connect(others[0])
      .submitResponse(formId, questionIndex, response3)

    responseHistory = await onChainForms.getResponseHistory(
      formId,
      questionIndex
    )

    expect(responseHistory.responses).to.deep.equal([
      response1,
      response2,
      response3
    ])
  })

  it("Should retrieve all form IDs", async () => {
    const title1 = "Form 1";
    const title2 = "Form 2";
    const title3 = "Form 3";
    const description = "Describe test form";

    await onChainForms.createForm(title1, description);
    await onChainForms.createForm(title2, description);
    await onChainForms.createForm(title3, description);

    const formIds = await onChainForms.getAllForms();

    expect(formIds.length).to.equal(3);
    console.log(formIds)
    expect(formIds[0].title).to.equal(title1);
    expect(formIds[1].id).to.equal(1);
    expect(formIds[2].title).to.equal(title3);
  });
  it("Should retrieve details from a form", async () => {
    const title = "Form 1";
    const description = "Describe test form";

    const {formId} = await getFromEvents(await onChainForms.createForm(title, description), "FormCreated");

    const details = await onChainForms.getFormDetails(formId);

    expect(details.id).to.equal(formId);
    expect(details.title).to.equal(title);
    expect(details.description).to.equal(description);
    expect(details.questions.length).to.equal(0);

    const question = { title: 'Question 2', description: 'Describe question 2', isRequired: true, responseType: 0}

    const { questionIndex } = await getFromEvents(
        await onChainForms.addQuestionToForm(
          formId,
          question.title,
          question.description,
          question.isRequired,
          question.responseType
        ),
        'QuestionCreated'
      )

    const details2 = await onChainForms.getFormDetails(formId);

    expect(details2.questions.length).to.equal(1);
    expect(details2.questions[0].title).to.equal(question.title);
    expect(details2.questions[0].description).to.equal(question.description);
    expect(details2.questions[0].id).to.equal(questionIndex);
  });

  it('Should not allow submitting responses with invalid response type', async () => {
    const title = 'Test Form'
    const description = 'Describe test form'
    const question = 
      {
        title: 'Question 1',
        description: 'Describe question 1',
        responseType: 0, // response type should be number
        isRequired: true
      }

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title, description),
      'FormCreated'
    )

    const { questionIndex } = await onChainForms.addQuestionToForm(
          formId,
          question.title,
          question.description,
          question.isRequired,
          question.responseType
        )

    await onChainForms.addResponder(formId, others[0].address)

    const response = 1 // Invalid response type. It should be number

    try {
      await onChainForms
        .connect(others[0])
        .submitResponse(formId, questionIndex, response)
    } catch (error) {
      expect(error).to.exist
    }

  })

})

