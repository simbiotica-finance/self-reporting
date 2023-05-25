// SPDX-License-Identifier: private
// This contract is privately owned by [Your Company Name].
// All rights reserved.
// You can specify additional details about ownership or licensing here.

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract OnChainForms is Ownable {
    using Counters for Counters.Counter;
    
    event FormCreated(uint formId, string title);
    event QuestionCreated(uint questionIndex, string title);

    Counters.Counter private _formIds;
    mapping(uint => Form) public forms;

    struct Response {
        string response;
        uint timestamp;
    }

    struct Question {
        string title;
        string description;
        bool isRequired;
        Counters.Counter responsesCount;
        mapping(uint => Response) responses;
    }

    struct Form {
        string title;
        Counters.Counter questionsCount;
        mapping(uint => Question) questions;
        Counters.Counter responsesCount;
        mapping(address => bool) allowedResponders;
    }

    function addResponders(uint _formId, address[] memory _responders) public onlyOwner {
        Form storage form = forms[_formId];
        for (uint i = 0; i < _responders.length; i++) {
            form.allowedResponders[_responders[i]] = true;
        }
    }

    function addResponder(uint _formId, address _responder) public onlyOwner {
        Form storage form = forms[_formId];
        form.allowedResponders[_responder] = true;
    }

    function isAllowedResponder(uint _formId, address _responder) public view returns (bool) {
        Form storage form = forms[_formId];
        return form.allowedResponders[_responder];
    }

    function createForm(string memory _title) public onlyOwner returns (uint formId) {
        _formIds.increment();
        formId = _formIds.current();
        forms[formId].title = _title;
        emit FormCreated(formId, _title);
    }

    function addQuestionToForm(uint _formId, string memory _questionTitle, string memory _questionDescription) public onlyOwner {
        Form storage form = forms[_formId];
        uint questionIndex = form.questionsCount.current();
        form.questions[questionIndex].title = _questionTitle;
        form.questions[questionIndex].description = _questionDescription;
        form.questions[questionIndex].isRequired = false;
        emit QuestionCreated(questionIndex, _questionTitle);
        form.questionsCount.increment();
    }

    function submitResponse(uint _formId, uint _questionIndex, string memory _response) public {
        Form storage form = forms[_formId];
        require(form.allowedResponders[msg.sender], "Not an allowed responder");
        require(_questionIndex < form.questionsCount.current(), "Invalid question index");

        Question storage question = form.questions[_questionIndex];

        uint timestamp = block.timestamp;
        Response memory newResponse = Response(_response, timestamp);
        uint responseIndex = question.responsesCount.current();
        question.responses[responseIndex] = newResponse;
        question.responsesCount.increment();

        if (question.responsesCount.current() == 1) {
            form.responsesCount.increment();
        }
    }

    function getForm(uint _formId) public view returns (
        string memory title, 
        uint questionsCount, 
        uint responsesCount, 
        string[] memory questionTitles, 
        string[] memory questionDescriptions
    ) {
        Form storage form = forms[_formId];
        questionTitles = new string[](form.questionsCount.current());
        questionDescriptions = new string[](form.questionsCount.current());

        for (uint i = 0; i < form.questionsCount.current(); i++) {
            questionTitles[i] = form.questions[i].title;
            questionDescriptions[i] = form.questions[i].description;
        }

        return (
            form.title, 
            form.questionsCount.current(), 
            form.responsesCount.current(), 
            questionTitles, 
            questionDescriptions
        );
    }

    function getFormDetails(uint _formId) public view returns (
        string memory title, 
        uint questionsCount, 
        uint responsesCount
    ) {
        Form storage form = forms[_formId];
        return (
            form.title, 
            form.questionsCount.current(), 
            form.responsesCount.current()
        );
    }

    function getQuestionDetails(uint _formId, uint _questionIndex) public view returns (
        string memory title,
        string memory description
    ) {
        Form storage form = forms[_formId];
        require(_questionIndex < form.questionsCount.current(), "Invalid question index");

        Question storage question = form.questions[_questionIndex];

        return (
            question.title, 
            question.description
        );
    }

    function getResponseHistory(uint _formId, uint _questionIndex) public view
        returns (string[] memory responses, uint[] memory timestamps)
    {
        Form storage form = forms[_formId];
        require(_questionIndex < form.questionsCount.current(), "Invalid question index");

        Question storage question = form.questions[_questionIndex];
        responses = new string[](question.responsesCount.current());
        timestamps = new uint[](question.responsesCount.current());

        for (uint i = 0; i < question.responsesCount.current(); i++) {
            responses[i] = question.responses[i].response;
            timestamps[i] = question.responses[i].timestamp;
        }

        return (responses, timestamps);
    }
}
