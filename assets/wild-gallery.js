(function () {
  'use strict';

  var COLOR_MAP = {
    black: '#111111', white: '#ffffff', blue: '#2563eb', navy: '#1e3a5f',
    red: '#dc2626', green: '#16a34a', grey: '#6b7280', gray: '#6b7280',
    brown: '#78350f', beige: '#d8c3a5', pink: '#ec4899', yellow: '#eab308',
    orange: '#ea580c', purple: '#7c3aed', tan: '#d2b48c', cream: '#f5f0e6'
  };

  var LOG_PREFIX = '[Shop the look]';

  function formatMoney(cents, currency) {
    var amount = cents / 100;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
      return amount.toFixed(2) + ' ' + currency;
    }
  }

  function refreshCartState() {
    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart } }));
        document.querySelectorAll('[data-cart-count], .cart-count-bubble, .cart-count').forEach(function (el) {
          el.textContent = cart.item_count;
        });
      })
      .catch(function () {});
  }

  // Per-modal state, keyed by the modal DOM node itself so multiple
  // instances of the section on one page each get independent state.
  var stateFor = new WeakMap();

  function getState(modal) {
    var s = stateFor.get(modal);
    if (!s) {
      s = { product: null, selections: [], autoAddProduct: null, resetTimer: null };
      stateFor.set(modal, s);
    }
    return s;
  }

  function loadAutoAddProduct(root) {
    var script = root.querySelector('[data-wg-autoadd]');
    if (!script) return null;
    try {
      return JSON.parse(script.textContent);
    } catch (e) {
      console.warn(LOG_PREFIX, 'could not parse auto-add product JSON', e);
      return null;
    }
  }

  function uniqueValuesForOption(product, index) {
    var values = [];
    product.variants.forEach(function (variant) {
      var val = variant['option' + (index + 1)];
      if (val && values.indexOf(val) === -1) values.push(val);
    });
    return values;
  }

  function findVariant(product, selections) {
    if (!product) return null;
    return (
      product.variants.find(function (variant) {
        return product.options.every(function (name, i) {
          return variant['option' + (i + 1)] === selections[i];
        });
      }) || null
    );
  }

  function updateAddState(modal, currency) {
    var state = getState(modal);
    var addBtn = modal.querySelector('[data-wg-add]');
    var addLabel = addBtn.querySelector('[data-wg-add-label]');
    var priceEl = modal.querySelector('[data-wg-price]');

    var variant = findVariant(state.product, state.selections);
    var allSelected =
      state.selections.length === state.product.options.length && state.selections.every(Boolean);

    if (variant && allSelected) {
      addBtn.disabled = !variant.available;
      addLabel.textContent = variant.available ? 'ADD TO CART' : 'SOLD OUT';
      priceEl.textContent = formatMoney(variant.price, currency);
      addBtn.dataset.variantId = variant.id;
    } else {
      addBtn.disabled = true;
      addLabel.textContent = 'SELECT OPTIONS';
      addBtn.dataset.variantId = '';
    }
  }

  function renderOptions(modal, currency) {
    var state = getState(modal);
    var product = state.product;
    var optionsEl = modal.querySelector('[data-wg-options]');
    optionsEl.innerHTML = '';
    state.selections = product.options.map(function () { return null; });

    product.options.forEach(function (name, i) {
      var wrap = document.createElement('div');
      wrap.className = 'wg-option';

      var label = document.createElement('div');
      label.className = 'wg-option-label';
      label.textContent = name;
      wrap.appendChild(label);

      var values = uniqueValuesForOption(product, i);
      var isColor = /colou?r/i.test(name);

      if (isColor) {
var swatchWrap = document.createElement('div');
swatchWrap.className = 'wg-swatches';

var slider = document.createElement('div');
slider.className = 'wg-swatch-slider';

swatchWrap.appendChild(slider);

values.forEach(function (val) {

    var btn = document.createElement('button');

    btn.type = 'button';

    btn.className = 'wg-swatch';

    btn.innerHTML = `
    <span class="wg-color-bar"></span>
    <span class="wg-color-text">${val}</span>`;

    btn.dataset.wgOptionIndex = String(i);

    btn.dataset.wgOptionValue = val;

    var known = COLOR_MAP[val.toLowerCase()];

    if (known) {
        btn.style.setProperty('--wg-swatch-color', known);
    }

    swatchWrap.appendChild(btn);

});

wrap.appendChild(swatchWrap);
      } else {
        var dropdown = document.createElement('div');
dropdown.className = 'wg-dropdown';
dropdown.dataset.wgOptionIndex = String(i);

dropdown.innerHTML = `
  <button type="button" class="wg-dropdown-trigger">
    <span>Choose your ${name.toLowerCase()}</span>
    <svg width="14" height="14" viewBox="0 0 20 20">
      <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.5" fill="none"/>
    </svg>
  </button>

  <div class="wg-dropdown-menu">
    ${values.map(function(val){
      return `<div class="wg-dropdown-item" data-value="${val}">
        ${val}
      </div>`;
    }).join('')}
  </div>
`;

wrap.appendChild(dropdown);
      }

      optionsEl.appendChild(wrap);
    });

    updateAddState(modal, currency);
  }

  function openModal(root, modal, product) {
    var currency = root.dataset.currency || 'USD';
    var state = getState(modal);
    state.product = product;
    state.autoAddProduct = state.autoAddProduct || loadAutoAddProduct(root);

    modal.querySelector('[data-wg-title]').textContent = product.title;

    var firstVariant = product.variants[0];
    modal.querySelector('[data-wg-price]').textContent = firstVariant
      ? formatMoney(firstVariant.price, currency)
      : '';

    modal.querySelector('[data-wg-desc]').textContent = product.description || '';

    var imageEl = modal.querySelector('[data-wg-image]');
    imageEl.src = product.image || '';
    imageEl.alt = product.title;

    renderOptions(modal, currency);
    modal.querySelector('[data-wg-message]').textContent = '';

    modal.hidden = false;
    document.body.classList.add('wg-modal-open');
  }

  function closeModal(modal) {
    var state = getState(modal);
    modal.hidden = true;
    document.body.classList.remove('wg-modal-open');
    if (state.resetTimer) clearTimeout(state.resetTimer);
  }

  function handleAddToCart(root, modal) {
    var currency = root.dataset.currency || 'USD';
    var state = getState(modal);
    var addBtn = modal.querySelector('[data-wg-add]');
    var addLabel = addBtn.querySelector('[data-wg-add-label]');
    var messageEl = modal.querySelector('[data-wg-message]');
    var variantId = addBtn.dataset.variantId;

    if (!variantId) return;

    addBtn.disabled = true;
    messageEl.textContent = 'Adding…';

    var items = [{ id: parseInt(variantId, 10), quantity: 1 }];
    var autoAdded = false;
    var autoAddProduct = state.autoAddProduct;

    if (autoAddProduct && state.selections.length) {
      var hasBlack = state.selections.some(function (v) { return v && v.toLowerCase() === 'black'; });
      var hasMedium = state.selections.some(function (v) { return v && v.toLowerCase() === 'medium'; });

      if (hasBlack && hasMedium) {
        var autoVariant =
          autoAddProduct.variants.find(function (v) { return v.available; }) || autoAddProduct.variants[0];
        if (autoVariant && String(autoVariant.id) !== String(variantId)) {
          items.push({ id: parseInt(autoVariant.id, 10), quantity: 1 });
          autoAdded = true;
        }
      }
    }

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: items })
    })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (err) { throw err; });
        return res.json();
      })
      .then(function () {
        messageEl.textContent = autoAdded
          ? 'Added to cart — plus the ' + autoAddProduct.title + '!'
          : 'Added to cart!';
        addLabel.textContent = 'ADDED ✓';
        refreshCartState();

        state.resetTimer = setTimeout(function () {
          addBtn.disabled = false;
          addLabel.textContent = 'ADD TO CART';
          messageEl.textContent = '';
        }, 2500);
      })
.catch(function (err) {
  console.error(LOG_PREFIX, 'add to cart failed', err);
  console.log('Error object:', err);
  console.log(JSON.stringify(err, null, 2));

  messageEl.textContent =
    (err && err.description) ||
    (err && err.message) ||
    'Could not add to cart.';

  addBtn.disabled = false;
  addLabel.textContent = 'ADD TO CART';
});
  }

  // ---------- Single delegated click/change handler for the whole document ----------
  // Using delegation (rather than binding listeners to each element at init time)
  // means quick-view buttons work even if the section HTML is injected/replaced
  // after this script first runs (theme editor, apps, lazy sections, etc.).

  document.addEventListener('click', function (e) {
    var openBtn = e.target.closest('[data-wg-open]');
    if (openBtn) {
      var root = openBtn.closest('.wg-root');
      var item = openBtn.closest('.wg-item');
      var modal = root && root.querySelector('[data-wg-modal]');
      var script = item && item.querySelector('[data-wg-product]');

      if (!root || !modal || !script) {
        console.warn(LOG_PREFIX, 'quick view button is missing required elements', {
          root: !!root, modal: !!modal, productScript: !!script
        });
        return;
      }

      try {
        var product = JSON.parse(script.textContent);
        openModal(root, modal, product);
      } catch (err) {
        console.error(LOG_PREFIX, 'could not parse product JSON', err);
      }
      return;
    }

    var closeEl = e.target.closest('[data-wg-close]');
    if (closeEl) {
      var modalToClose = closeEl.closest('[data-wg-modal]');
      if (modalToClose) closeModal(modalToClose);
      return;
    }

    var swatch = e.target.closest('.wg-swatch');
    if (swatch) {
      var swatchModal = swatch.closest('[data-wg-modal]');
      var swatchRoot = swatch.closest('.wg-root');
      if (!swatchModal || !swatchRoot) return;
      var state = getState(swatchModal);
      var index = parseInt(swatch.dataset.wgOptionIndex, 10);
      state.selections[index] = swatch.dataset.wgOptionValue;

      swatch.parentElement.querySelectorAll('.wg-swatch').forEach(function (el) {
        el.classList.remove('is-selected');
      });
      swatch.classList.add('is-selected');
      var slider = swatch.parentElement.querySelector('.wg-swatch-slider');

if (slider) {

    slider.style.width = swatch.offsetWidth + 'px';

    slider.style.left = swatch.offsetLeft + 'px';

}
      updateAddState(swatchModal, swatchRoot.dataset.currency || 'USD');
      return;
    }

    var addBtn = e.target.closest('[data-wg-add]');
    if (addBtn) {
      var addModal = addBtn.closest('[data-wg-modal]');
      var addRoot = addBtn.closest('.wg-root');
      if (addModal && addRoot) handleAddToCart(addRoot, addModal);
      return;
    }
  });

document.addEventListener('click', function(e){

    var trigger = e.target.closest('.wg-dropdown-trigger');

    if(trigger){

        var dropdown = trigger.parentElement;

        document.querySelectorAll('.wg-dropdown').forEach(function(d){

            if(d !== dropdown){
                d.classList.remove('open');
            }

        });

        dropdown.classList.toggle('open');

        return;
    }

    var item = e.target.closest('.wg-dropdown-item');

    if(item){

        var dropdown = item.closest('.wg-dropdown');

        var triggerText = dropdown.querySelector('.wg-dropdown-trigger span');

        triggerText.textContent = item.dataset.value;
        dropdown.querySelectorAll('.wg-dropdown-item').forEach(function(el){
        el.classList.remove('selected');
      });

      item.classList.add('selected');

        dropdown.classList.remove('open');

        var modal = dropdown.closest('[data-wg-modal]');
        var root = dropdown.closest('.wg-root');

        var state = getState(modal);

        var index = parseInt(dropdown.dataset.wgOptionIndex,10);

        state.selections[index] = item.dataset.value;

        updateAddState(modal, root.dataset.currency || 'USD');

        return;
    }

    if(!e.target.closest('.wg-dropdown')){

        document.querySelectorAll('.wg-dropdown').forEach(function(d){

            d.classList.remove('open');

        });

    }

});

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[data-wg-modal]').forEach(function (modal) {
      if (!modal.hidden) closeModal(modal);
    });
  });

  // Highlight the active hotspot while its block is selected in the theme editor,
  // making it easy to see and fine-tune its position with the x/y sliders.
  document.addEventListener('shopify:block:select', function (e) {
    var hotspot = e.target.querySelector && e.target.querySelector('.wg-hotspot');
    if (hotspot) hotspot.classList.add('is-editor-selected');
  });
  document.addEventListener('shopify:block:deselect', function (e) {
    var hotspot = e.target.querySelector && e.target.querySelector('.wg-hotspot');
    if (hotspot) hotspot.classList.remove('is-editor-selected');
  });

  console.log(LOG_PREFIX, 'script loaded');
})();
