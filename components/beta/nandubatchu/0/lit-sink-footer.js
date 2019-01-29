import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class FooterElement extends LitElement {

    static get properties() {
        return {}
    }
  
    render() {
        return html`
            <style>
                #footer {
					display: grid;
					grid-auto-flow: column;
					justify-content: end;
					align-items: center;
					height: 20px;
					width: 100%;
				}
				#credits {
					padding-right: 20px;
					font-size: small;
				}
            </style>
            
        	<div id="footer">
				<span id="credits">made by <a href="https://twitter.com/nandubatchu">@nandubatchu</a></span>
			</div>
        `;
    }  
}

customElements.define('lit-sink-footer', FooterElement);