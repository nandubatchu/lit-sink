import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

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
            
        	<button>
				<slot></slot>
			</button>
        `;
    }  
}

customElements.define('my-button', GreyButtonElement);