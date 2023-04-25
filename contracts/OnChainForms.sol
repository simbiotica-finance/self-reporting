// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract OnChainForms {
    uint256 public formCount;
    address public owner;

    struct Form {
        string title;
        string[] questions;
        uint numResponses;
    }

    constructor() {
        owner = msg.sender;
    }


    mapping(uint => Form) public forms;

    mapping(uint => mapping(address => mapping(uint => string[]))) public responsesByTimestamp;
    mapping(uint => mapping(address => uint[])) public responseTimestamps;
    mapping(uint => mapping(uint => address)) public responders;
    mapping(uint => mapping(address => bool)) public responseExists;
    mapping(uint => mapping(address => bool)) public allowedResponders;

    modifier onlyOwner {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    function addResponders(uint _formIndex, address[] memory _responders) public onlyOwner {
        for (uint i = 0; i < _responders.length; i++) {
            allowedResponders[_formIndex][_responders[i]] = true;
        }
    }

    function createForm(string memory _title, string[] memory _questions) public onlyOwner  {
        formCount++;
        uint formIndex = formCount;
        forms[formIndex] = Form({
            title: _title,
            questions: _questions,
            numResponses: 0
        });
    }

    function submitResponse(uint _formIndex, uint _questionIndex, string memory _response) public {
        require(allowedResponders[_formIndex][msg.sender], "Not an allowed responder");
        Form storage form = forms[_formIndex];
        require(_questionIndex < form.questions.length, "Invalid question index");

        uint timestamp = block.timestamp;
        responsesByTimestamp[_formIndex][msg.sender][_questionIndex].push(_response);
        responseTimestamps[_formIndex][msg.sender].push(timestamp);

        if (!responseExists[_formIndex][msg.sender]) {
            responders[_formIndex][form.numResponses] = msg.sender;
            responseExists[_formIndex][msg.sender] = true;
            form.numResponses++;
        }
    }

    function getForm(uint _formIndex) public view returns (string memory title, string[] memory questions) {
        Form storage form = forms[_formIndex];
        return (form.title, form.questions);
    }

    function getResponseHistory(uint _formIndex, address _responder, uint _questionIndex) public view returns (string[] memory responseHistory, uint[] memory timestamps) {
        responseHistory = responsesByTimestamp[_formIndex][_responder][_questionIndex];
        timestamps = responseTimestamps[_formIndex][_responder];
        return (responseHistory, timestamps);
    }
}
