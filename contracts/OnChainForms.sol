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
    event ResponseSubmitted(uint formId, uint questionIndex, uint response, address responder);

    Counters.Counter private _formIds;
    mapping(uint => Form) public forms;
    mapping(address => Response[]) public responderResponses;


    struct Response {
        uint response;
        uint timestamp;
    }

    enum ResponseType { Number }

    struct Question {
        string title;
        string description;
        bool isRequired;
        ResponseType responseType;
        Counters.Counter responsesCount;
        mapping(uint => Response) responses;
    }

    struct DisplayForm {
        uint id;
        string title;
    }

    struct DisplayQuestion {
        uint id;
        string title;
        string description;
    }


    struct Form {
        string title;
        string description;
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

    function createForm(string memory _title, string memory _description) public onlyOwner returns (uint formId) {
        formId = _formIds.current();
        forms[formId].title = _title;
        forms[formId].description = _description;
        emit FormCreated(formId, _title);
        _formIds.increment();

    }

    function addQuestionToForm(
        uint _formId, 
        string calldata _questionTitle, 
        string calldata _questionDescription,
        bool _isRequired,
        ResponseType _responseType
    ) public onlyOwner {    
        Form storage form = forms[_formId];
        uint questionIndex = form.questionsCount.current();
        form.questions[questionIndex].title = _questionTitle;
        form.questions[questionIndex].description = _questionDescription;
        form.questions[questionIndex].isRequired = _isRequired;
        form.questions[questionIndex].responseType = _responseType;
        emit QuestionCreated(questionIndex, _questionTitle);
        form.questionsCount.increment();

    }

    function submitResponse(uint _formId, uint _questionIndex, uint _response) public {
        Form storage form = forms[_formId];
        require(form.allowedResponders[msg.sender], "Not an allowed responder");
        require(_questionIndex < form.questionsCount.current(), "Invalid question index");

        Question storage question = form.questions[_questionIndex];
        require(question.responseType == ResponseType.Number, "Invalid response type");

        uint timestamp = block.timestamp;
        uint responseIndex = question.responsesCount.current();
        Response memory newResponse = Response(_response, timestamp);
        question.responses[responseIndex] = newResponse;
        question.responsesCount.increment();
        form.responsesCount.increment();

        responderResponses[msg.sender].push(newResponse);
        emit ResponseSubmitted(_formId, _questionIndex, _response, msg.sender);
    }

    function submitMultipleResponses(
        uint _formId, 
        uint[] calldata _questionIndices, 
        uint[] calldata _responses
    ) public {
        require(_questionIndices.length == _responses.length, "Mismatched question indices and responses");

        // Instead of a mapping, we create an array with a size equal to the total number of questions
        bool[] memory answeredQuestions = new bool[](forms[_formId].questionsCount.current());

        for (uint i = 0; i < _questionIndices.length; i++) {
            uint questionIndex = _questionIndices[i];
            submitResponse(_formId, questionIndex, _responses[i]);

            // Here we set the corresponding index in the array to true
            answeredQuestions[questionIndex] = true;
        }

        // Check if all required questions have been answered
        Form storage form = forms[_formId];
        for (uint i = 0; i < form.questionsCount.current(); i++) {
            Question storage question = form.questions[i];

            if (question.isRequired && !answeredQuestions[i]) {
                revert("A required question has not been answered");
            }
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

    function getAllForms() public view returns (DisplayForm[] memory formsResponse) {
        uint formsCount = _formIds.current();
        formsResponse = new DisplayForm[](formsCount);
        for (uint i = 0; i < formsCount; i++) {
            formsResponse[i].id = i ;
            formsResponse[i].title = forms[i].title;
        }
        return formsResponse;
    }

    function getFormDetails(uint _formId) public view returns (
        uint id,
        string memory title, 
        string memory description,
        uint questionsCount, 
        DisplayQuestion[] memory questions
    ) {
        Form storage form = forms[_formId];
        uint totalQuestions = form.questionsCount.current();

        questions = new DisplayQuestion[](totalQuestions);

        for (uint i = 0; i < totalQuestions; i++) {
            Question storage question = form.questions[i];
            questions[i] = DisplayQuestion(i,question.title, question.description);
        }

        return (
            _formId,
            form.title, 
            form.description,
            totalQuestions, 
            questions
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
        returns (uint[] memory responses, uint[] memory timestamps)
    {
        Form storage form = forms[_formId];
        require(_questionIndex < form.questionsCount.current(), "Invalid question index");

        Question storage question = form.questions[_questionIndex];
        responses = new uint[](question.responsesCount.current());
        timestamps = new uint[](question.responsesCount.current());

        for (uint i = 0; i < question.responsesCount.current(); i++) {
            responses[i] = question.responses[i].response;
            timestamps[i] = question.responses[i].timestamp;
        }

        return (responses, timestamps);
    }
    function getResponsesByResponder(address _responder) public view returns (Response[] memory) {
        if (responderResponses[_responder].length > 0) {
            return responderResponses[_responder];
        } else {
            return new Response[](0);
        }
    }


}
