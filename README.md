# Descentralized on-chain form submition

This repository aims to create a smart-contract that could receive answers in a decentralized manner. Users are able to submit public responses continuously and consult the timeline. 

## How to use

- Add the private key on the .env file or publish the `PRIVATE_KEY` env for the deployment. 
- Create a custom form on `scripts/custom-form.json`

```
[
  {
    "name": "deploy" 
  },
  {
    "name": "add-form",
    "title": "Impact On-chain Form",
    "description": "Share your positive impact to the world, with blockchain security.."
  },
  {
    "name": "add-question",
    "title": "Business Model and Impact: Is the operation of the Institution directly related to the proposed impact?",
    "description": "If your Institution's commercial results are directly related to the positive impact that your Institution proposes to make, answer Yes. If the impact is right, answer No.",
    "responseType": 0,
    "required": true
  },
  {
    "name": "add-responder",
    "address": "0xe52025ECFe3E724203f755118e20C73500A6Ac6A"
  }
]
```
- Run the tasks using `npm run process-json -- ./scripts/YOUR-FORM-NAME.json`
- Check the `tasks` for each individual task executed by the script.

## Important

- Only `responders` are allowed to responde a question. Only then owner of the contract can add responders. You can add them individually by executing: 

```bash
npm run add-responder -- --contract [CONTRACT-ADDRESS] --formid [FORM-ID] --address [RESPONDER-ADDRESS]
```
- Responders are public. It might be interesting to implement link-proofs for those responders.  
- Forms are presented as individual questions on the response.
- Only `integers` are working as a response type. There is an ongoing effort to implement `DynamicDataType` state. 
- As discovered though the execution of this project, dependencies are assumed to change the contract state, even if they don't. This might require a merge on DynamicDataType into OnChainForms. 