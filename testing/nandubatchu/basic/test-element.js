import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

import 'https://cdn.jsdelivr.net/gh/nandubatchu/lit-sink/testing/test-element.js'

class ButtonElement extends LitElement {

    static get properties() {
        return {
            mood: {type: String}
        }
    }

    render() {
        return html`
            <style>
                button {
					background: pink;
				}
            </style>
            
        	<button @click=${() => {console.log("You clicked on the pink button!")}}>
				<slot></slot
			</button>
        `;
    }  
}

customElements.define('my-button', ButtonElement);