import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

import 'https://cdn.jsdelivr.net/gh/nandubatchu/lit-sink/testing/test-element.js'

class MyElement extends LitElement {

    static get properties() {
        return {
            mood: {type: String}
        }
    }

    render() {
        return html`
            <style>
                button {
					background: green;
				}
            </style>
            
        	<my-element> Try here!</my-element>
        `;
    }  
}

customElements.define('my-element', MyElement);


























