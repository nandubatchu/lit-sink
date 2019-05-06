import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

import 'https://cdn.jsdelivr.net/gh/nandubatchu/lit-sink@59ca895/components/beta/nandubatchu/0/my-button.js'

class GreyButtonElement extends LitElement {

    static get properties() {
        return {}
    }

    render() {
        return html`
            <style>
                button {
					background: grey;
					color: white;
					height: 25px;
				}
            </style>
            
        	<div>
				<my-button>My Text</my-button>
				<my-button>My Text 2</my-button>
			</div>
        `;
    }  
}

customElements.define('my-button', GreyButtonElement);