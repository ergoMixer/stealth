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

function generateStealthErgoTree(
    grHex: String,
    gyHex: String,
    urHex: String,
    uyHex: String
): ErgoTree {
    return new ErgoTree(
        `10040e21${grHex}0e21${gyHex}0e21${urHex}0e21${uyHex}ceee7300ee7301ee7302ee7303`
    );
}

// validate stealthPK should be in format: "stealth" + Base58 encoded of (pk + leftmost 4 bytes blake2b256(pk))
function validateStealthPK(stealthPK: String): void {
    const splitPK = stealthPK.split("stealth");
    if (splitPK.length !== 2) throw "invalid stealthPk";
    const decodedPK = Base58.decode(splitPK[1]);
    const mainPK = decodedPK.slice(0, decodedPK.length - 4);
    const checksumPK = decodedPK.slice(-4);
    const leftmost4BytesHashPK = blake2b(mainPK, null, 32).slice(0, 4)
    // validate checksum
    if (!isEqual(checksumPK, leftmost4BytesHashPK)) throw "invalid checksum";
}

function App() {
    const [stealthPK, setStealthPK] = useState("");
    const [result, setResult] = useState("");

    function handleChange(event) {
        setStealthPK(event.target.value)
        !event.target.value && setResult("")
    }

    function generateAddress() {
        try {
            validateStealthPK(stealthPK);
            const splitPK = stealthPK.split("stealth");
            const decodedPK = Base58.decode(splitPK[1]);
            // remove checksum and get main PK
            const mainPK = decodedPK.slice(0, decodedPK.length - 4);
            const u = ec.curve.decodePoint(mainPK);
            const r = new BN(rand(32));
            const y = new BN(rand(32));

            const gr = g.mul(r).encode("hex", true);
            const gy = g.mul(y).encode("hex", true);
            const ur = u.mul(r).encode("hex", true);
            const uy = u.mul(y).encode("hex", true);

            const generatedAddress = generateStealthErgoTree(
                gr,
                gy,
                ur,
                uy
            ).toAddress(Network.Mainnet);
            setResult(`${generatedAddress.toString(Network.Mainnet)}`);
        } catch (error) {
            setResult(`Error: ${error}`);
        }
    }

    return (
        <div className="container">
            <div className="header">
            <img src={`${process.env.PUBLIC_URL}/img.png`} id="image-logo"/>
                <div className="header-texts">
                    <h1>Stealth Address Generator</h1>
                    <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been
                        the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley
                        of type and scrambled it to make a type specimen book. It has survived not only five centuries,
                        but also the leap into electronic typesetting, remaining essentially unchanged. It was
                        popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages,
                        and more recently with desktop publishing software like Aldus PageMaker including versions of
                        Lorem Ipsum.</p>
                </div>
            </div>
            <label htmlFor="stealthPK" className="margin">Receiver's Stealth PK:</label>
            <input
                type="text"
                className="margin"
                id="stealthPK"
                value={stealthPK}
                onChange={handleChange}
            />
            <button className="margin" onClick={generateAddress}>Generate Address</button>
            {
                result &&
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
            }

        </div>
    );
}

export default App;
