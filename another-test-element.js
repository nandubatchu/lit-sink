import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

import 'https://cdn.jsdelivr.net/gh/nandubatchu/lit-sink/test-element.js';

class MyElement extends LitElement {

    static get properties() {
        return {
            mood: {type: String}
        }
    }

    render() {
        return html`           
            Element2
            <my-element></my-element>
        `;
    }  
}

customElements.define('my-element2', MyElement);