```javascript
const { expect, contract, artifacts } = require('hardhat');
const { ethers } = require('ethers');

describe('TonMicroPaymentStreaming', async () => {
  let contract, owner, user1, user2;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];

    const contractFactory = await ethers.getContractFactory('TonMicroPaymentStreaming');
    contract = await contractFactory.deploy();
    await contract.deployed();
  });

  describe('Constructor', async () => {
    it('should set paused to false', async () => {
      expect(await contract.paused()).to.be.false;
    });

    it('should set billing rate to 1e8', async () => {
      expect(await contract.BILLING_RATE()).to.be.equal(1e8);
    });
  });

  describe('Create Stream', async () => {
    it('should create a new stream', async () => {
      const amount = 100;
      await contract.createStream(amount);
      expect(await contract.streams(1)).to.be.not.undefined;
      expect(await contract.isSubscribed(1)).to.be.true;
    });

    it('should emit StreamCreated event', async () => {
      const amount = 100;
      const tx = await contract.createStream(amount);
      await expect(tx).to.emit(contract, 'StreamCreated').withArgs(1);
    });

    it('should revert if paused', async () => {
      await contract.setPaused(true);
      const amount = 100;
      await expect(contract.createStream(amount)).to.be.revertedWith('Emergency pause activated');
    });

    it('should revert if amount is 0', async () => {
      await contract.setPaused(false);
      const amount = 0;
      await expect(contract.createStream(amount)).to.be.revertedWith('Stream amount must be greater than zero');
    });
  });

  describe('Cancel Stream', async () => {
    beforeEach(async () => {
      await contract.createStream(100);
    });

    it('should cancel an existing stream', async () => {
      await contract.cancelStream(1);
      expect(await contract.streams(1)).to.be.undefined;
      expect(await contract.isSubscribed(1)).to.be.false;
    });

    it('should emit StreamCanceled event', async () => {
      const tx = await contract.cancelStream(1);
      await expect(tx).to.emit(contract, 'StreamCanceled').withArgs(1);
    });

    it('should revert if paused', async () => {
      await contract.setPaused(true);
      await expect(contract.cancelStream(1)).to.be.revertedWith('Emergency pause activated');
    });

    it('should revert if stream does not exist', async () => {
      await contract.setPaused(false);
      await expect(contract.cancelStream(1)).to.be.revertedWith('Stream does not exist');
    });
  });

  describe('Subscription Status', async () => {
    beforeEach(async () => {
      await contract.createStream(100);
    });

    it('should update subscription status', async () => {
      await contract.setSubscriptionStatus(1, false);
      expect(await contract.isSubscribed(1)).to.be.false;
    });

    it('should emit SubscriptionUpdated event', async () => {
      const tx = await contract.setSubscriptionStatus(1, false);
      await expect(tx).to.emit(contract, 'SubscriptionUpdated').withArgs(1, false);
    });
  });

  describe('Access Control', async () => {
    it('should only allow owner to create stream', async () => {
      const user1Contract = contract.connect(user1);
      await expect(user1Contract.createStream(100)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should only allow owner to cancel stream', async () => {
      const user1Contract = contract.connect(user1);
      await contract.createStream(100);
      await expect(user1Contract.cancelStream(1)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should only allow owner to update subscription status', async () => {
      const user1Contract = contract.connect(user1);
      await contract.createStream(100);
      await expect(user1Contract.setSubscriptionStatus(1, false)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should only allow owner to set paused', async () => {
      const user1Contract = contract.connect(user1);
      await expect(user1Contract.setPaused(true)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Edge Cases', async () => {
    it('should not allow negative amount', async () => {
      await expect(contract.createStream(-100)).to.be.revertedWith('Stream amount must be greater than zero');
    });

    it('should not allow zero amount', async () => {
      await expect(contract.createStream(0)).to.be.revertedWith('Stream amount must be greater than zero');
    });
  });
});
```

This comprehensive test suite ensures that the TonMicroPaymentStreaming contract behaves as expected in various scenarios, including:

1. Constructor tests: Verifies that the paused and billing rate variables are set correctly.
2. Happy path tests: Tests the createStream, cancelStream, and setSubscriptionStatus functions with valid inputs.
3. Revert tests: Verifies that the contract reverts with the expected error messages for invalid inputs.
4. Access control tests: Ensures that only the owner can perform certain actions.
5. Edge case tests: Tests the contract's behavior for extreme or unusual inputs.

Note that these tests are written using the ethers.js v6 syntax and assume that the TonMicroPaymentStreaming contract has been deployed using the Hardhat framework.