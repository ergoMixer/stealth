import {useState} from "react";
import {ec as EC, rand} from "elliptic";
import BN from "bn.js";
import {ErgoTree, Network} from "@fleet-sdk/core";
import Base58 from "base-58";
import {blake2b} from "blakejs";
import {isEqual} from "lodash";
import CopyToClipboard from "@vigosan/react-copy-to-clipboard";
import QRCode from "react-qr-code";

const ec = new EC("secp256k1");
const g = ec.g;

function generateStealthPaymentErgoTree(grHex, gyHex, urHex, uyHex) {
    return new ErgoTree(
        `10040e21${grHex}0e21${gyHex}0e21${urHex}0e21${uyHex}ceee7300ee7301ee7302ee7303`
    );
}

// validate stealthAddress should be in format: "stealth" + Base58 encoded of (pk + leftmost 4 bytes blake2b256(pk))
function validateStealthAddress(stealthAddress) {
    const splitAddress = stealthAddress.split("stealth");
    if (splitAddress.length !== 2) throw Error("invalid stealthAddress");
    const decodedAddress = Base58.decode(splitAddress[1]);
    const mainAddress = decodedAddress.slice(0, decodedAddress.length - 4);
    const checksumAddress = decodedAddress.slice(-4);
    const leftmost4BytesHashAddress = blake2b(mainAddress, null, 32).slice(0, 4)
    // validate checksum
    if (!isEqual(checksumAddress, leftmost4BytesHashAddress)) throw Error("invalid checksum");
}

function App() {
    const [stealthAddress, setStealthAddress] = useState("");
    const [result, setResult] = useState("");
    const [isError, setIsError] = useState(false);

    function handleChange(event) {
        setStealthAddress(event.target.value)
        !event.target.value && setResult("")
    }

    function generatePaymentAddress() {
        try {
            validateStealthAddress(stealthAddress);
            const splitAddress = stealthAddress.split("stealth");
            const decodedAddress = Base58.decode(splitAddress[1]);
            // remove checksum and get main Address
            const mainAddress = decodedAddress.slice(0, decodedAddress.length - 4);
            const u = ec.curve.decodePoint(mainAddress);
            const r = new BN(rand(32));
            const y = new BN(rand(32));

            const gr = g.mul(r).encode("hex", true);
            const gy = g.mul(y).encode("hex", true);
            const ur = u.mul(r).encode("hex", true);
            const uy = u.mul(y).encode("hex", true);

            const generatedPaymentAddress = generateStealthPaymentErgoTree(
                gr,
                gy,
                ur,
                uy
            ).toAddress(Network.Mainnet);
            setResult(`${generatedPaymentAddress.toString(Network.Mainnet)}`);
            setIsError(false)
        } catch (error) {
            setResult(`${error}`);
            setIsError(true)
        }
    }

    return (
        <div className="container">
            <div className="header">
                <img className="imageStealthAddress" src={`${process.env.PUBLIC_URL}/img.png`} id="image-logo"
                     alt={""}/>
                <div className="header-texts">
                    <h2 className="headerStealth">Stealth Payment Address Generator</h2>
                    <p className="stealthAddressText">
                        <b>What is a stealth Address?</b>
                        <text> A receiver can generate a Stealth Address to preserve his privacy.
                            It starts with "stealth" word and allows any sender to create new payment addresses for this
                            receiver without any interaction.
                        </text>
                        <br/>

                        <b>How to generate a stealth Address?</b>
                        <text> It can be generated in the ErgoMixer.</text>
                        <br/>

                        <b>Can I send funds to a stealth Address?</b>
                        <text> No, use this address generator to create a new payment address and use it as the
                            receiver's address in any wallet.
                        </text>
                    </p>
                </div>
            </div>
            <label htmlFor="stealthAddress" className="margin">Receiver's Stealth Address:</label>
            <textarea
                placeholder="Enter Input"
                className="margin"
                id="stealthAddress"
                rows={2}
                value={stealthAddress}
                onChange={handleChange}
            />
            <button className="margin" onClick={generatePaymentAddress}>Generate New Payment Address</button>
            {
                result &&
                <div className="result-container margin">
                    {isError ? <div className="no-result">
                        <p>{result}</p>
                    </div> : (
                        <div className="result-container margin">
                            <CopyToClipboard
                                render={({copy}) => (
                                    <div className="result" onClick={
                                        () => {
                                            copy(result)
                                            alert("Copied to clipboard!")
                                        }
                                    }>
                                        <p>{result}</p>
                                    </div>
                                )}
                            />
                            <div>
                                <QRCode
                                    size={150}
                                    value={`https://explorer.ergoplatform.com/payment-request?address=${result}`}
                                />
                            </div>
                        </div>
                    )}
                </div>
            }

        </div>
    );
}

export default App;
