// Copyright (c) 2018, Maxwell Morais and contributors
// For license information, please see license.txt

frappe.ui.form.on('Action', {
	onload_post_render: (frm) => {
		frm.set_query('dt', 'bindings', (doc) => {
			return {
				'filters': {
					'istable': ["!=", 1], 
					'issingle':["!=", 1], 
					'module': ['!=', 'Core']
				}
			}
		});
		frm.set_query('dt', 'mappings', (doc) => {
			return {
				'filters': {
					'istable': ["!=", 1], 
					'issingle':["!=", 1], 
					'module': ['!=', 'Core'],
					'name': ['in', frm.doc.bindings.map(function(d){ return d.dt; })]
				}
			}
		});
		frm.set_query('dt', 'triggers', (doc) => {
			return {
				'filters': {
					'istable': ["!=", 1], 
					'issingle':["!=", 1], 
					'module': ['!=', 'Core']
				}
			}
		});
		$(frm.wrapper).on('grid-row-render', function(e, grid_row){
			if (grid_row.doc.doctype === "Action Mapping"){
				var df = frappe.utils.filter_dict(grid_row.docfields, {'fieldname': 'argument'})[0]; 
				df.options = [null].concat(frm.doc.arguments.map(function(d){
					return {'value': d.argname, 'label': __(d.label)};
				}));
			}
		});
	},
	refresh: function(frm) {
		if (!frm.doc.__islocal){
			frm.add_custom_button(
				__("Test Action"),
				() => {
					if (frm.doc.arguments.length){
						var with_dialog = true,
							bindable = [null],
							fields = [];
						if (Array.isArray(frm.doc.bindings) && frm.doc.bindings.length){
							fields.push({
								'label': __('Select one Record to Bind'),
								'fieldtype': 'Section Break'
							});
							frm.doc.bindings.forEach(function(bind){
								if (bind.dt && !bindable.includes(bind.dt)){
									bindable.push(bind.dt);
								}
							});
							fields.push({
								'label': __('DocType to Bind'),
								'fieldname': 'bind_doctype',
								'fieldtype': 'Select',
								'options': bindable,
								'reqd': 1
							});
							fields.push({'fieldtype': 'Column Break'})
							fields.push({
								'label': __('ID to Bind'),
								'fieldname': 'bind_docname',
								'fieldtype': 'Dynamic Link',
								'options': 'bind_doctype',
								'reqd': 1
							});
							Array.isArray(frm.doc.arguments) && frm.doc.arguments.length && frm.doc.arguments[0].argtype !== "Section Break" && fields.push({'fieldtype': 'Section Break'});
						}
						fields = fields.concat(frm.doc.arguments.map((f) => {
							return {
								'label': f.argtype !== "Column Break" ? __(f.label) : null,
								'fieldtype': f.argtype,
								'fieldname': __(f.argname),
								'reqd': f.required,
								'options': f.options,
								'default': f.default,
								'depends_on': f.depends_on
							}
						}));
					} else {
						var with_dialog = false;
					}

					if (!with_dialog){
						frappe.call({
							'method': 'studio.api.run_action',
							'args': {
								'action': frm.doc.name,
								'context': {
									'doc': frm.doc
								},
								'kwargs': {}
							},
							'callback': function(res){
							},
							'freeze': true,
						});
					} else {
						frappe.prompt(
							fields,
							(kwargs) => {
								frappe.model.with_doc(kwargs.bind_doctype, kwargs.bind_name, function(name, _r){
									delete kwargs.bind_doctype;
									delete kwargs.bind_docname;
									frappe.call({
										'method': 'studio.api.run_action',
										'args': {
											'action': frm.doc.name,
											'context': {
												'doc': frm.doc
											},
											'kwargs': kwargs
										},
										'freeze': true
									});
								});
							},
							__('Run Action'),
							__('Run')
						);
					}
				}
			)
		}
	}
});

frappe.ui.form.on('Action Argument', 'label', function(frm, cdt, cdn){
	var d = locals[cdt][cdn], options = [null];
	frappe.model.set_value(cdt, cdn, 'argname', frappe.scrub(d.label).normalize('NFD').replace(/[\u0300-\u036f]/g, ""));
	options = options.concat(frm.doc[d.parentfield].filter((r) => {
		return !frappe.model.no_value_type.includes(r.argtype);
	}).map((r) => {
		return {'value': r.argname, 'label': r.label};
	}));
	frappe.utils.filter_dict(frm.fields_dict.mappings.grid.docfields, {'fieldname': 'argument'})[0].options = options;
	frm.refresh_field('mappings');
});

frappe.ui.form.on('Action Mapping', 'dt', function(frm, cdt, cdn){
	var d = locals[cdt][cdn], options = [];
	if (!d.dt) return;
	frappe.call({
		'method': 'studio.api.get_field_options',
		'args': {
			'doctype': d.dt
		},
		'callback': (res) => {
			if (res && res.message) {
				options = options.concat(res.message);
				var df = frm.fields_dict[d.parentfield].grid.grid_rows_by_docname[cdn].get_field('fieldname');
				df.df.options = options;
				df.refresh();
			}
		}
	});
});
