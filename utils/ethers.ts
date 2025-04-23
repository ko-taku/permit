import { ethers } from 'ethers';
import { abi, address as contractAddress } from '../abis/MyGasslessToken.json';

const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || '';
const spenderPrivateKey = process.env.SPENDER_PRIVATE_KEY || '';

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:7545');

// 토큰의 소유권을 가지고 있는 계정
export const owner = new ethers.Wallet(ownerPrivateKey, provider);
// Owner에게서 허가를 받고, 토큰을 사용할 가스비 대납 계정
export const spender = new ethers.Wallet(spenderPrivateKey, provider);
// spender가 transferFrom으로 owner에게서 토큰을 전송할 계정
export const recipient = ethers.Wallet.createRandom();

// Owner의 시점에서 사용할 MyGasslessToken 컨트랙트
export const contractByOwner = new ethers.Contract(contractAddress, abi, owner);
// Spender의 시점에서 사용할 MyGasslessToken 컨트랙트
export const contractBySpender = new ethers.Contract(
  contractAddress,
  abi,
  spender
);

export const ownerBalance = async () => {
  return await provider.getBalance(owner.address);
};

// 위의 코드는 수정하지 않습니다.

export const getBalance = async (address: string) => {
  try {
    // Todo: getBalance는 인자로 받는 address의 잔액을 리턴해야 합니다.(balanceOf)
    const balanceWei = await contractByOwner.balanceOf(address);
    const balanceEth = ethers.formatUnits(balanceWei, 18);
    console.log('Type of balanceWei:', typeof balanceWei);
    console.log('Type of balanceETH:', typeof balanceEth);
    return balanceWei;
  } catch (error) {
    console.error('Error in getBalance:', error);
  }
};

export const getAllowance = async (owner: string, spender: string) => {
  try {
    // Todo: getAllowance는 인자로 들어오는 owner가 spender에게 허용한 금액을 리턴해야 합니다.(allowance)
    return await contractByOwner.allowance(owner, spender);
  } catch (error) {
    console.error('Error in allowance:', error);
  }
};

export const permit = async () => {
  try {
    /*
        Todo: 
        permit 함수는 [domain], [types], [message]를 정의하여 가스 대납자의 시점(contractBySpender)에서 permit을 실행합니다.
        owner가 가진 전체 Balance를 spender에게 permit 시킵니다.
    */
    const ownerBalance = await getBalance(owner.address);
    const deadline = Math.floor(Date.now() / 1000) + 1800;
    const nonce = await contractByOwner.nonces(owner.address);

    const domain = {
      name: 'MyGasslessToken',
      version: '1',
      chainId: (await provider.getNetwork()).chainId,
      verifyingContract: contractAddress,
    };
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value: ownerBalance,
      nonce: nonce,
      deadline: deadline,
    };

    const signature = await owner.signTypedData(domain, types, message);

    const recoverAddress = ethers.verifyTypedData(
      domain,
      types,
      message,
      signature
    ); //signature 전체를 이용해서 주소 복원만 해주는 high-level 함수

    const { v, r, s } = ethers.Signature.from(signature);
    //signature를 분석해서 v, r, s 값을 분해할 때 사용

    const permit = await contractBySpender.permit(
      message.owner,
      message.spender,
      message.value,
      message.deadline,
      v,
      r,
      s
    );
    await permit.wait();

  } catch (error) {
    console.error('Error in permit:', error);
  }
};

export const tranferFrom = async (from: string, to: string, value: bigint) => {
  try {
    // Todo: from이 to에게 value만큼 가스 대납자의 시점(contractBySpender)에서 transferFrom을 실행합니다.
    const transferFrom = await contractBySpender.transferFrom(from, to, value);
    transferFrom.wait();
  } catch (error) {
    console.error('Error in tranferFrom:', error);
  }
};
