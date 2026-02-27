<form>
    <div class="mb-3">
        <label for="name">[[admin/appearance/skins:custom-skin-name]]</label>
        <input type="text" name="custom-skin-name" class="form-control">
    </div>

    <div class="mb-3">
        <label>[[admin/appearance/skins:custom-skin-colors]]</label>
        <div class="row g-3">
            <div class="col-md-6">
                <label for="primary-color" class="form-label small">[[admin/appearance/skins:primary-color]]</label>
                <div class="input-group">
                    <input type="color" id="primary-color" class="form-control form-control-color" value="#007bff" title="[[admin/appearance/skins:primary-color]]">
                    <input type="text" id="primary-color-text" class="form-control" placeholder="#007bff" maxlength="7">
                </div>
            </div>
            <div class="col-md-6">
                <label for="secondary-color" class="form-label small">[[admin/appearance/skins:secondary-color]]</label>
                <div class="input-group">
                    <input type="color" id="secondary-color" class="form-control form-control-color" value="#6c757d" title="[[admin/appearance/skins:secondary-color]]">
                    <input type="text" id="secondary-color-text" class="form-control" placeholder="#6c757d" maxlength="7">
                </div>
            </div>
        </div>
    </div>

    <div class="mb-3">
        <label for="_variables">[[admin/appearance/skins:custom-skin-variables]]</label>
        <textarea name="_variables" id="custom-skin-variables" class="form-control" rows="20"></textarea>
        <small class="form-text text-muted">[[admin/appearance/skins:custom-skin-variables-help]]</small>
    </div>
</form>