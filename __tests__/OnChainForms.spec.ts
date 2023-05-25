import { Contract, Transaction, Wallet } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { deployContract } from 'ethereum-waffle' // this adds expect(onChainForms.address).to.be.properAddress (???)
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('OnChainForms', () => {
  let onChainForms: Contract
  let owner: SignerWithAddress
  let others: SignerWithAddress[]

  async function getFromEvents(
    firstPromise: any,
    eventName: string
  ): Promise<any> {
    const tx = firstPromise
    const receipt = await tx.wait()
    const event = receipt.events?.find((e: any) => e.event === eventName)
    return event?.args
  }

  beforeEach(async () => {
    const OnChainForms = await ethers.getContractFactory('OnChainForms')
    onChainForms = await OnChainForms.deploy()
    await onChainForms.deployed()
    ;[owner, ...others] = await ethers.getSigners()
  })

  it('Should deploy successfully', async () => {
    expect(onChainForms.address).to.be.properAddress
  })

  it('Should create a form successfully', async () => {
    const title = 'Test Form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1' },
      { title: 'Question 2', description: 'Describe question 2' }
    ]

    for (let question of questions) {
      await onChainForms.createForm(title)
      await onChainForms.addQuestionToForm(
        1,
        question.title,
        question.description
      )
    }

    const formDetails = await onChainForms.getFormDetails(1)
    expect(formDetails.title).to.equal(title)
    expect(formDetails.questionsCount).to.equal(questions.length)

    for (let i = 0; i < questions.length; i++) {
      let questionDetails = await onChainForms.getQuestionDetails(1, i)
      expect(questionDetails.title).to.equal(questions[i].title)
      expect(questionDetails.description).to.equal(questions[i].description)
    }
  })

  it('Should add responders successfully', async () => {
    const title = 'Test Form2'
    const questions = [
      { title: 'Question 1', description: 'Desc 1' },
      { title: 'Question 2', description: 'Desc 2' }
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description
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
    const questions = [
      { title: 'Question 1', description: 'Describe question 1' }
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title),
      'FormCreated'
    )

    let questionIndex
    for (let question of questions) {
      const events = await getFromEvents(
        await onChainForms.addQuestionToForm(
          formId,
          question.title,
          question.description
        ),
        'QuestionCreated'
      )
      questionIndex = events.questionIndex
    }

    await onChainForms.addResponder(formId, others[0].address)

    const response = 'Answer 1'

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
    const questions = [
      { title: 'Question 1', description: 'Describe question 1' },
      { title: 'Question 2', description: 'Describe question 2' }
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description
      )
    }

    const responder = others[0].address
    const questionIndex = 0
    const response = 'Answer 1'

    await expect(
      onChainForms
        .connect(others[0])
        .submitResponse(formId, questionIndex, response)
    ).to.be.revertedWith('Not an allowed responder')
  })

  it('Should not allow submitting responses with invalid question index', async () => {
    const title = 'Test Form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1' },
      { title: 'Question 2', description: 'Describe question 2' }
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description
      )
    }

    const responders = others.slice(0, 2).map(wallet => wallet.address)
    await onChainForms.addResponders(formId, responders)

    const questionIndex = 2 // Invalid question index
    const response = 'Answer 1'

    await expect(
      onChainForms
        .connect(others[0])
        .submitResponse(formId, questionIndex, response)
    ).to.be.revertedWith('Invalid question index')
  })

  it('Should not allow non-owners to create forms', async () => {
    const title = 'Test Form'
    await expect(
      onChainForms.connect(others[0]).createForm(title)
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('Should not allow non-owners to add responders', async () => {
    const title = 'Test Form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1' },
      { title: 'Question 2', description: 'Describe question 2' }
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description
      )
    }

    const responders = others.slice(0, 2).map(wallet => wallet.address)

    await expect(
      onChainForms.connect(others[0]).addResponders(formId, responders)
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('Should get the correct response history and timestamps', async () => {
    const title = 'Test Form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1' },
      { title: 'Question 2', description: 'Describe question 2' }
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description
      )
    }

    const responders = others.slice(0, 2).map(wallet => wallet.address)
    await onChainForms.addResponders(formId, responders)

    const [responder] = responders
    const questionIndex = 0
    const response1 = 'Answer 1'
    const response2 = 'Answer 2'

    await onChainForms
      .connect(others[0])
      .submitResponse(formId, questionIndex, response1)
    await onChainForms
      .connect(others[0])
      .submitResponse(formId, questionIndex, response2)

    const responseHistory = await onChainForms.getResponseHistory(
      formId,
      questionIndex
    )
    expect(responseHistory.responses).to.deep.equal([response1, response2])
    expect(responseHistory.timestamps[0]).to.lessThan(
      responseHistory.timestamps[1]
    )
  })

  it('Should retrieve all responses from a particular responder', async () => {
    const title = 'Test Form'
    const questions = [
      { title: 'Question 1', description: 'Describe question 1' },
      { title: 'Question 2', description: 'Describe question 2' }
    ]

    const { formId } = await getFromEvents(
      await onChainForms.createForm(title),
      'FormCreated'
    )

    for (let question of questions) {
      await onChainForms.addQuestionToForm(
        formId,
        question.title,
        question.description
      )
    }

    const responders = others.slice(0, 2).map(wallet => wallet.address)
    await onChainForms.addResponders(formId, responders)

    const [responder] = responders
    const questionIndex = 0
    const response1 = 'Answer 1'
    const response2 = 'Answer 2'

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

    const response3 = 'Answer 3'

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
})

