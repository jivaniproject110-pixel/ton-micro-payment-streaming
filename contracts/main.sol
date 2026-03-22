```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract TonMicroPaymentStreaming is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using Address for address;

    // Emergency pause status
    bool public paused;

    // Per-second billing rate
    uint256 public constant BILLING_RATE = 1e8;

    // Mapping of stream IDs to stream data
    mapping (uint256 => StreamData) public streams;

    // Mapping of stream IDs to subscription status
    mapping (uint256 => bool) public isSubscribed;

    event StreamCreated(uint256 indexed streamId);
    event StreamCanceled(uint256 indexed streamId);
    event SubscriptionUpdated(uint256 indexed streamId, bool indexed isSubscribed);
    event EmergencyPauseActivated(bool indexed paused);
    event EmergencyPauseDeactivated(bool indexed paused);

    // Data structure for stream
    struct StreamData {
        uint256 amount;
        uint256 lastPayment;
    }

    // Create a new stream
    function createStream(uint256 _amount) external nonReentrant {
        require(!paused, "Emergency pause activated");
        require(_amount > 0, "Stream amount must be greater than zero");

        uint256 streamId = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)));
        streams[streamId] = StreamData(_amount, block.timestamp);
        isSubscribed[streamId] = true;

        emit StreamCreated(streamId);
    }

    // Cancel an existing stream
    function cancelStream(uint256 _streamId) external nonReentrant {
        require(!paused, "Emergency pause activated");
        require(streams[_streamId].amount > 0, "Stream does not exist");

        delete streams[_streamId];
        delete isSubscribed[_streamId];

        emit StreamCanceled(_streamId);
    }

    // Update subscription status
    function updateSubscription(uint256 _streamId, bool _isSubscribed) external nonReentrant {
        require(!paused, "Emergency pause activated");
        require(streams[_streamId].amount > 0, "Stream does not exist");

        isSubscribed[_streamId] = _isSubscribed;

        emit SubscriptionUpdated(_streamId, _isSubscribed);
    }

    // Pay for an existing stream per second
    function payPerSecond(uint256 _streamId) external nonReentrant {
        require(!paused, "Emergency pause activated");
        require(streams[_streamId].amount > 0, "Stream does not exist");

        uint256 timeDiff = block.timestamp.sub(streams[_streamId].lastPayment);
        uint256 payment = timeDiff.mul(BILLING_RATE);

        streams[_streamId].amount = streams[_streamId].amount.sub(payment);
        streams[_streamId].lastPayment = block.timestamp;

        if (streams[_streamId].amount == 0) {
            cancelStream(_streamId);
        }
    }

    // Emergency pause
    function emergencyPause(bool _paused) external onlyOwner {
        paused = _paused;

        emit EmergencyPauseActivated(paused);
        emit EmergencyPauseDeactivated(!paused);
    }

    // Get the current stream data
    function getStream(uint256 _streamId) external view returns (uint256, uint256) {
        require(streams[_streamId].amount > 0, "Stream does not exist");

        return (streams[_streamId].amount, streams[_streamId].lastPayment);
    }
}
```

```solidity
// Proxy contract for TonMicroPaymentStreaming
contract TonMicroPaymentStreamingProxy is TransparentUpgradeableProxy {
    constructor(address _implementation) public TransparentUpgradeableProxy(_implementation, address(this), "") {}
}
```