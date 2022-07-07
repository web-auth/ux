'use strict';

import { Controller } from '@hotwired/stimulus';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

export default class extends Controller {
    static values = {
        requestResultUrl: String,
        requestOptionsUrl: String,
        requestSuccessRedirectUri: String,
        creationResultUrl: String,
        creationOptionsUrl: String,
        creationSuccessRedirectUri: String,
        usernameField: String,
        displayNameField: String,
        attestationField: String,
        userVerificationField: String,
        residentKeyField: String,
        authenticatorAttachmentField: String,
    };

    initialize() {
        this._dispatchEvent = this._dispatchEvent.bind(this);
        this._getData = this._getData.bind(this);
    }

    connect() {
        const options = {
            requestResultUrl: this.requestResultUrl || '/request',
            requestOptionsUrl: this.requestOptionsUrl || '/request/options',
            requestSuccessRedirectUri: this.requestSuccessRedirectUri || null,
            creationResultUrl: this.creationResultUrl || '/creation',
            creationOptionsUrl: this.creationOptionsUrl || '/creation/options',
            creationSuccessRedirectUri: this.creationSuccessRedirectUri || null,
        };

        this._dispatchEvent('webauthn:connect', { options });
    }

    async signin(event: Event) {
        console.log('CSR-01');
        event.preventDefault();
        console.log('CSR-02');
        const data = this._getData();
        console.log('CSR-03');
        const optionsHeaders = {
            'Content-Type': 'application/json',
        };
        console.log('CSR-04');
        this._dispatchEvent('webauthn:request:options', { data, headers: optionsHeaders });
        console.log('CSR-05');
        const resp = await fetch(this.requestOptionsUrlValue || '/request/options', {
            method: 'POST',
            headers: optionsHeaders,
            body: JSON.stringify(data),
        });
        console.log('CSR-06');
        const asseResp = await startAuthentication(await resp.json());

        console.log('CSR-07');
        const responseHeaders = {
            'Content-Type': 'application/json',
        };

        console.log('CSR-08');
        this._dispatchEvent('webauthn:request:response', { response: asseResp, headers: responseHeaders });
        console.log('CSR-09');
        const verificationResp = await fetch(this.requestResultUrlValue || '/request', {
            method: 'POST',
            headers: responseHeaders,
            body: JSON.stringify(asseResp),
        });
        console.log('CSR-10');
        const verificationJSON = await verificationResp.json();

        console.log('CSR-11');
        if (verificationJSON && verificationJSON.errorMessage === '') {
            console.log('CSR-12');
            this._dispatchEvent('webauthn:request:success', verificationJSON);
            console.log('CSR-13');
            if (this.requestSuccessRedirectUriValue) {
                console.log('CSR-14');
                window.location.replace(this.requestSuccessRedirectUriValue);
                console.log('CSR-15');
            }
            console.log('CSR-16');
        } else {
            console.log('CSR-17');
            this._dispatchEvent('webauthn:request:failure', verificationJSON.errorMessage);
            console.log('CSR-18');
        }
        console.log('CSR-19');
    }

    async signup(event: Event) {
        event.preventDefault();
        const data = this._getData();
        const optionsHeaders = {
            'Content-Type': 'application/json',
        };
        this._dispatchEvent('webauthn:creation:options', { data, headers: optionsHeaders });
        const resp = await fetch(this.creationOptionsUrlValue || '/creation/options', {
            method: 'POST',
            headers: optionsHeaders,
            body: JSON.stringify(data),
        });

        const attResp = await startRegistration(await resp.json());
        const responseHeaders = {
            'Content-Type': 'application/json',
        };
        this._dispatchEvent('webauthn:creation:response', { response: attResp, headers: responseHeaders });
        const verificationResp = await fetch(this.creationResultUrlValue || '/creation', {
            method: 'POST',
            headers: responseHeaders,
            body: JSON.stringify(attResp),
        });

        const verificationJSON = await verificationResp.json();
        if (verificationJSON && verificationJSON.errorMessage === '') {
            this._dispatchEvent('webauthn:creation:success', verificationJSON);
            if (this.creationSuccessRedirectUriValue) {
                window.location.replace(this.creationSuccessRedirectUriValue);
            }
        } else {
            this._dispatchEvent('webauthn:creation:failure', verificationJSON.errorMessage);
        }
    }

    _dispatchEvent(name: string, payload: any) {
        this.element.dispatchEvent(new CustomEvent(name, { detail: payload, bubbles: true }));
    }

    _getData() {
        let data = new FormData();
        try {
            data = new FormData(this.element);
        } catch (e) {
            //Nothing to do
        }

        function removeEmpty(obj) {
            return Object.entries(obj)
                .filter(([_, v]) => v !== null)
                .reduce(
                    (acc, [k, v]) => ({ ...acc, [k]: v === Object(v) ? removeEmpty(v) : v }),
                    {}
                );
        }

        return removeEmpty({
            username: data.get(this.usernameField || 'username'),
            displayName: data.get(this.displayNameField || 'displayName'),
            attestation: data.get(this.attestationField || 'attestation'),
            userVerification: data.get(this.userVerificationField || 'userVerification'),
            residentKey: data.get(this.residentKeyField || 'residentKey'),
            authenticatorAttachment: data.get(this.authenticatorAttachmentField || 'authenticatorAttachment'),
        });
    }
}
