pragma solidity ^0.8.0;

contract DynamicTypeStorage {
    struct DynamicData {
        bytes rawBytes;
        uint8 dataType;
    }

    mapping(address => DynamicData) private storageData;

    function storeData(bytes calldata _data, uint8 _dataType) external {
        storageData[msg.sender] = DynamicData(_data, _dataType);
    }

    function retrieveData() external view returns (bytes memory, uint8) {
        DynamicData storage data = storageData[msg.sender];
        return (data.rawBytes, data.dataType);
    }

    function parseData(bytes memory _rawBytes, uint8 _dataType) public pure returns (string memory) {
        if (_dataType == 0) {
            // Assuming dataType 0 represents a string type
            return abi.decode(_rawBytes, (string));
        } else if (_dataType == 1) {
            // Assuming dataType 1 represents an integer type
            return abi.decode(_rawBytes, (uint256)).toString();
        }
        // Add more cases for other data types as needed
        revert("Unsupported data type");
    }
}