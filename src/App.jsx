
import { ethers } from 'ethers'
import React, { useState, useEffect } from 'react';

function App() {
  // The contract address you're trying to interact with
  const contractAddress = "0xa42b1378D1A84b153eB3e3838aE62870A67a40EA";
  const contractABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "getItemByOwner",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "itemCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "items",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        },
        {
          "internalType": "address payable",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "isSold",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_price",
          "type": "uint256"
        }
      ],
      "name": "listItem",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "ownedItems",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "purchaseItem",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_to",
          "type": "address"
        }
      ],
      "name": "transferItem",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  // State variables
  const [provider, setProvider] = useState(null);
  const [network, setNetwork] = useState(null);
  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [ownedItems, setOwnedItems] = useState([]);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [contractConnected, setContractConnected] = useState(false);
  const [contractExists, setContractExists] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [diagnostics, setDiagnostics] = useState({
    contractCode: "",
    networkName: "",
    contractChecked: false
  });

  useEffect(() => {
    const init = async () => {
      console.log("Initializing app...");
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          // const provider = new ethers.BrowserProvider(window.ethereum);

          setProvider(provider);
          console.log("Provider set");

          // Get network information
          const network = await provider.getNetwork();
          setNetwork(network);
          console.log("Network:", network.name);
          setDiagnostics(prev => ({ ...prev, networkName: network.name }));

          // Correct event name for account changes
          window.ethereum.on("accountsChanged", async (accounts) => {
            console.log("Account changed to:", accounts[0]);
            setAccount(accounts[0]);

            // Reconnect with new account
            const signer = provider.getSigner();
            setSigner(signer);
            await connectContract(signer);
          });

          // Request account access
          const accounts = await provider.send("eth_requestAccounts", []);
          console.log("Connected account:", accounts[0]);
          setAccount(accounts[0]);

          const signer = provider.getSigner();
          setSigner(signer);

          await connectContract(signer);

          // Show success notification
          showNotification("Connected to wallet successfully", "success");
        } catch (error) {
          console.error("Initialization error:", error);
          showNotification("Failed to connect to wallet: " + error.message, "error");
        }
      } else {
        console.error("Ethereum provider not found");
        showNotification("MetaMask not detected. Please install MetaMask to use this application.", "error");
      }
    };

    init();
  }, []);

  const connectContract = async (signer) => {
    try {
      // First check if the contract exists at the specified address
      const code = await provider.getCode(contractAddress);
      setDiagnostics(prev => ({ ...prev, contractCode: code, contractChecked: true }));

      // '0x' means no contract at this address
      if (code === '0x') {
        console.error("No contract found at the specified address");
        setContractExists(false);
        showNotification("No contract found at the specified address. Make sure you're on the correct network.", "error");
        return;
      }

      setContractExists(true);
      console.log("Contract exists at the specified address");

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      setContract(contract);
      console.log("Contract instance created");

      // Test if contract has expected functions
      try {
        // Simple call to check if contract interface matches
        await contract.callStatic.itemCount();
        setContractConnected(true);
        console.log("Contract interface verified");

        // Load data from contract
        await loadItems(contract);
        await loadOwnedItems(contract, await signer.getAddress());

        showNotification("Contract connected successfully", "success");
      } catch (error) {
        console.error("Contract interface mismatch:", error);
        setContractConnected(false);
        showNotification("Contract exists but doesn't match the expected interface. Check your ABI and network.", "error");
      }
    } catch (error) {
      console.error("Contract connection error:", error);
      showNotification("Failed to connect to contract: " + error.message, "error");
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification({ message: "", type: "" });
    }, 5000);
  };

  const loadItems = async (contract) => {
    try {
      console.log("Loading items...");
      const itemCount = await contract.itemCount();
      console.log("Item count:", itemCount.toString());

      let itemsArray = [];

      for (let i = 1; i <= itemCount.toNumber(); i++) {
        console.log(`Fetching item ${i}...`);
        const item = await contract.items(i);
        console.log(`Item ${i}:`, item);
        itemsArray.push(item);
      }

      console.log("All items loaded:", itemsArray.length);
      setItems(itemsArray);
      return true;
    } catch (error) {
      console.error("Error loading items:", error);
      return false;
    }
  };

  const loadOwnedItems = async (contract, owner) => {
    try {
      if (!owner) {
        console.warn("No owner address provided to loadOwnedItems");
        return false;
      }

      console.log(`Loading owned items for ${owner}...`);
      const ownedItemsIDs = await contract.getItemByOwner(owner);
      console.log("Owned item IDs:", ownedItemsIDs);

      let ownedItemsArray = [];

      for (let i = 0; i < ownedItemsIDs.length; i++) {
        const id = ownedItemsIDs[i].toNumber();
        console.log(`Fetching owned item ${id}...`);
        const item = await contract.items(id);
        console.log(`Owned item ${id}:`, item);
        ownedItemsArray.push(item);
      }

      console.log("All owned items loaded:", ownedItemsArray.length);
      setOwnedItems(ownedItemsArray);
      return true;
    } catch (error) {
      console.error("Error loading owned items:", error);
      return false;
    }
  };

  const listItem = async () => {
    if (!contractConnected) {
      showNotification("Contract not properly connected. Please check network settings.", "error");
      return;
    }

    if (!itemName.trim()) {
      showNotification("Item name cannot be empty", "error");
      return;
    }

    if (!itemPrice.trim()) {
      showNotification("Item price cannot be empty", "error");
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Listing item: ${itemName} for ${itemPrice} ETH`);

      // Ensure price is properly formatted for Ethereum
      let formattedPrice;
      try {
        formattedPrice = ethers.utils.parseEther(itemPrice);
      } catch (error) {
        showNotification("Invalid price format. Please enter a valid number.", "error");
        setIsLoading(false);
        return;
      }

      // Send the transaction
      const tx = await contract.listItem(itemName, formattedPrice);
      showNotification(`Transaction sent! Hash: ${tx.hash.substring(0, 10)}...`, "info");
      console.log("Transaction sent:", tx.hash);

      // Wait for confirmation
      await tx.wait();
      console.log("Transaction confirmed");
      showNotification("Item listed successfully!", "success");

      // Reset form fields
      setItemName("");
      setItemPrice("");

      // Reload items
      await loadItems(contract);
      await loadOwnedItems(contract, account);
    } catch (error) {
      console.error("Error listing item:", error);

      // Show appropriate error message
      if (error.code === 4001) {
        showNotification("Transaction rejected by user", "error");
      } else if (error.message.includes("gas")) {
        showNotification("Transaction failed: Gas estimation error or insufficient funds", "error");
      } else {
        showNotification(`Error listing item: ${error.message}`, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseItem = async (id, price) => {
    if (!contractConnected) {
      showNotification("Contract not properly connected", "error");
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Purchasing item ${id} for ${price} ETH`);
      const tx = await contract.purchaseItem(id, { value: ethers.utils.parseEther(price) });
      showNotification(`Purchase initiated! Transaction hash: ${tx.hash.substring(0, 10)}...`, "info");
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      showNotification("Item purchased successfully!", "success");
      await loadItems(contract);
      await loadOwnedItems(contract, account);
    } catch (error) {
      console.error("Error purchasing item:", error);
      if (error.code === 4001) {
        showNotification("Transaction rejected by user", "error");
      } else {
        showNotification(`Error purchasing item: ${error.message}`, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const transferItem = async (id, toAddress) => {
    if (!contractConnected) {
      showNotification("Contract not properly connected", "error");
      return;
    }

    if (!ethers.utils.isAddress(toAddress)) {
      showNotification("Invalid recipient address", "error");
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Transferring item ${id} to ${toAddress}`);
      const tx = await contract.transferItem(id, toAddress);
      showNotification(`Transfer initiated! Transaction hash: ${tx.hash.substring(0, 10)}...`, "info");
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      showNotification("Item transferred successfully!", "success");
      await loadItems(contract);
      await loadOwnedItems(contract, account);
    } catch (error) {
      console.error("Error transferring item:", error);
      if (error.code === 4001) {
        showNotification("Transaction rejected by user", "error");
      } else {
        showNotification(`Error transferring item: ${error.message}`, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Debug and diagnosis component
  const DebugPanel = () => (
    <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc', backgroundColor: '#f8f8f8', borderRadius: '5px' }}>
      <h3>Diagnostics</h3>

      <div style={{ marginBottom: '10px' }}>
        <strong>Connection Status:</strong>
        <ul>
          <li>Wallet Connected: {account ? "✅" : "❌"}</li>
          <li>Current Network: {diagnostics.networkName || "Unknown"}</li>
          <li>Contract Address: {contractAddress}</li>
          <li>Contract Exists: {contractExists ? "✅" : "❌"}</li>
          <li>Contract Interface Matches: {contractConnected ? "✅" : "❌"}</li>
        </ul>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Action Diagnostics:</strong>
        <button
          onClick={async () => {
            if (provider) {
              const code = await provider.getCode(contractAddress);
              setDiagnostics(prev => ({ ...prev, contractCode: code, contractChecked: true }));
              if (code === '0x') {
                showNotification("No contract found at the specified address on this network", "error");
              } else {
                showNotification("Contract exists at the specified address", "success");
              }
            }
          }}
          style={{ marginRight: '10px', padding: '5px 10px' }}
        >
          Check Contract
        </button>

        <button
          onClick={async () => {
            if (provider) {
              const network = await provider.getNetwork();
              setDiagnostics(prev => ({ ...prev, networkName: network.name }));
              showNotification(`Connected to ${network.name} network`, "info");
            }
          }}
          style={{ marginRight: '10px', padding: '5px 10px' }}
        >
          Check Network
        </button>

        <button
          onClick={() => {
            if (signer) {
              connectContract(signer);
            }
          }}
          style={{ padding: '5px 10px' }}
        >
          Reconnect Contract
        </button>
      </div>

      <div style={{ backgroundColor: '#e9e9e9', padding: '10px', borderRadius: '5px' }}>
        <p><strong>Contract Bytecode</strong> (empty means no contract at address):</p>
        <div style={{
          wordBreak: 'break-all',
          maxHeight: '60px',
          overflowY: 'auto',
          fontSize: '12px',
          backgroundColor: '#f2f2f2',
          padding: '5px',
          borderRadius: '3px'
        }}>
          {diagnostics.contractCode || "Not checked yet"}
        </div>
      </div>
    </div>
  );

  // Notification component
  const Notification = ({ message, type }) => {
    if (!message) return null;

    const styles = {
      container: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 20px',
        borderRadius: '5px',
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      },
      success: {
        backgroundColor: '#4CAF50',
        color: 'white'
      },
      error: {
        backgroundColor: '#F44336',
        color: 'white'
      },
      info: {
        backgroundColor: '#2196F3',
        color: 'white'
      }
    };

    return (
      <div style={{ ...styles.container, ...(styles[type] || styles.info) }}>
        {message}
      </div>
    );
  };

  // A component to show when contract is not connected
  const ContractNotConnected = () => (
    <div style={{
      padding: '20px',
      margin: '20px 0',
      backgroundColor: '#ffebee',
      borderRadius: '5px',
      border: '1px solid #ffcdd2'
    }}>
      <h3 style={{ color: '#c62828' }}>Contract Connection Issue</h3>
      <p>There seems to be an issue connecting to the marketplace contract. This could be due to one of the following reasons:</p>
      <ol style={{ marginLeft: '20px' }}>
        <li>The contract doesn't exist at address <strong>{contractAddress}</strong> on the current network ({diagnostics.networkName || "unknown"}).</li>
        <li>You're connected to the wrong network. The contract might be deployed on a different network.</li>
        <li>The contract ABI doesn't match the deployed contract.</li>
      </ol>
      <p>Please check your connection settings and try again.</p>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Blockchain Marketplace</h1>

      {notification.message &&
        <Notification message={notification.message} type={notification.type} />
      }

      <DebugPanel />

      {!contractConnected && <ContractNotConnected />}

      <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>List New Item</h2>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="itemName" style={{ display: 'block', marginBottom: '5px' }}>Item Name:</label>
          <input
            id="itemName"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder='Enter item name'
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="itemPrice" style={{ display: 'block', marginBottom: '5px' }}>Price (ETH):</label>
          <input
            id="itemPrice"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            placeholder='Enter price in ETH'
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <button
          onClick={listItem}
          disabled={isLoading || !contractConnected}
          style={{
            padding: '10px 15px',
            backgroundColor: contractConnected ? '#4CAF50' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoading || !contractConnected) ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Processing...' : 'List Item'}
        </button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Items for Sale ({items.length})</h2>
        {!contractConnected ? (
          <p>Cannot load items - contract not connected</p>
        ) : items.length === 0 ? (
          <p>No items available for sale</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {items.map((item, index) => (
              <div key={index} style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'white',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{item.name}</h3>
                <p><strong>Price:</strong> {ethers.utils.formatEther(item.price)} ETH</p>
                <p><strong>Owner:</strong> {item.owner.substring(0, 6)}...{item.owner.substring(38)}</p>
                <p><strong>Status:</strong> {item.isSold ? "Sold" : "For Sale"}</p>

                {!item.isSold && item.owner.toLowerCase() !== account.toLowerCase() && (
                  <button
                    onClick={() => purchaseItem(item.id, ethers.utils.formatEther(item.price))}
                    disabled={isLoading}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      width: '100%',
                      marginTop: '10px'
                    }}
                  >
                    {isLoading ? 'Processing...' : 'Purchase'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2>Your Items ({ownedItems.length})</h2>
        {!contractConnected ? (
          <p>Cannot load owned items - contract not connected</p>
        ) : ownedItems.length === 0 ? (
          <p>You don't own any items yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {ownedItems.map((item, index) => (
              <div key={index} style={{
                border: '1px solid #ddd',
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: 'white',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{item.name}</h3>
                <p><strong>Price:</strong> {ethers.utils.formatEther(item.price)} ETH</p>
                <p><strong>Owner:</strong> You</p>

                <input
                  id={`transferAddress${item.id}`}
                  placeholder="Transfer to Address"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
                <button
                  onClick={() => transferItem(
                    item.id,
                    document.getElementById(`transferAddress${item.id}`).value
                  )}
                  disabled={isLoading}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                >
                  {isLoading ? 'Processing...' : 'Transfer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;



