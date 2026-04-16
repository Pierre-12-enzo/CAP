// components/TemplateManager.jsx - UPDATED FOR BOTH SIDES
import React, { useState, useEffect } from 'react';
import { templateAPI } from '../../services/api';

const TemplateManager = () => {

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        description: '',
        frontSide: null,
        backSide: null,
        setAsDefault: false
    });

    // Load templates
    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const response = await templateAPI.getTemplates();
            if (response.success) {
                setTemplates(response.templates);
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            alert('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    // Upload new template with both sides
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!newTemplate.frontSide || !newTemplate.backSide) {
            alert('Please select both front and back side files');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('name', newTemplate.name || `Template ${Date.now()}`);
            formData.append('description', newTemplate.description);
            formData.append('frontSide', newTemplate.frontSide);
            formData.append('backSide', newTemplate.backSide);
            formData.append('setAsDefault', newTemplate.setAsDefault.toString());

            const response = await templateAPI.uploadTemplate(formData);
            if (response.success) {
                setShowUploadModal(false);
                setNewTemplate({
                    name: '',
                    description: '',
                    frontSide: null,
                    backSide: null,
                    setAsDefault: false
                });
                await loadTemplates(); // Refresh list
                alert('Template uploaded successfully!');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    // Set default template
    const handleSetDefault = async (templateId) => {
        try {
            const response = await templateAPI.setDefaultTemplate(templateId);
            if (response.success) {
                await loadTemplates(); // Refresh list
                alert('Default template updated!');
            }
        } catch (error) {
            console.error('Failed to set default:', error);
            alert(error.message || 'Failed to set default template');
        }
    };

    // Delete template
    const handleDelete = async (template) => {
        if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

        try {
            const response = await templateAPI.deleteTemplate(template._id);
            if (response.success) {
                await loadTemplates(); // Refresh list
                alert('Template deleted successfully!');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert(error.message || 'Failed to delete template');
        }
    };

    // File input handler for both sides
    const handleFileSelect = (side, e) => {
        const file = e.target.files[0];
        if (file) {
            setNewTemplate(prev => ({
                ...prev,
                [side]: file,
                name: prev.name || `Template ${Date.now()}`
            }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Template Management</h1>
                            <p className="text-gray-600 mt-2">Upload and manage your ID card templates (Front & Back sides)</p>
                        </div>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center"
                        >
                            <i className="pi pi-plus mr-2"></i>
                            Upload Template
                        </button>
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Available Templates</h2>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <i className="pi pi-info-circle"></i>
                            <span>{templates.length} template(s)</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <i className="pi pi-spinner pi-spin text-2xl text-emerald-600"></i>
                            <p className="text-gray-600 mt-2">Loading templates...</p>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <i className="pi pi-images text-gray-400 text-2xl"></i>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
                            <p className="text-gray-600 mb-4">Upload your first template with both sides to get started</p>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600"
                            >
                                Upload Template
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(template => (
                                <TemplateCard
                                    key={template._id}
                                    template={template}
                                    onSetDefault={handleSetDefault}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <UploadModal
                    newTemplate={newTemplate}
                    setNewTemplate={setNewTemplate}
                    onFileSelect={handleFileSelect}
                    onSubmit={handleUpload}
                    onCancel={() => setShowUploadModal(false)}
                    uploading={uploading}
                />
            )}
        </div>
    );
};

// Template Card Component - SIMPLE WORKING VERSION
const TemplateCard = ({ template, onSetDefault, onDelete }) => {
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPreviews = async () => {
            setLoading(true);
            try {
                console.log('📦 Loading template:', template.name);

                // Use frontSideUrl and backSideUrl from API response
                if (template.frontSideUrl) {
                    console.log('🖼️ Using frontSideUrl:', template.frontSideUrl);
                    setFrontPreview(template.frontSideUrl);
                }

                if (template.backSideUrl) {
                    console.log('🖼️ Using backSideUrl:', template.backSideUrl);
                    setBackPreview(template.backSideUrl);
                }

            } catch (error) {
                console.error('Error loading previews:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPreviews();
    }, [template]);

    return (
        <div className={`border-2 rounded-2xl p-4 transition-all duration-300 lg:w-80 ${template.isDefault
                ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                : 'border-gray-200 hover:border-emerald-300'
            }`}>
            {/* Template Previews */}
            <div className="flex space-x-2 mb-4">
                {/* Front Side */}
                <div className="flex-2">
                    <div className="text-xs text-gray-500 mb-1 text-center">Front</div>
                    <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {loading ? (
                            <i className="pi pi-spinner pi-spin text-gray-400"></i>
                        ) : frontPreview ? (
                            <img
                                src={frontPreview}
                                alt={`${template.name} - Front`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    console.log('❌ Front image failed, trying fallback');
                                    e.target.src = template.frontSide?.filepath || template.frontSide?.url;
                                }}
                            />
                        ) : (
                            <i className="pi pi-image text-gray-400"></i>
                        )}
                    </div>
                </div>

                {/* Back Side */}
                <div className="flex-2">
                    <div className="text-xs text-gray-500 mb-1 text-center">Back</div>
                    <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {loading ? (
                            <i className="pi pi-spinner pi-spin text-gray-400"></i>
                        ) : backPreview ? (
                            <img
                                src={backPreview}
                                alt={`${template.name} - Back`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    console.log('❌ Back image failed, trying fallback');
                                    e.target.src = template.backSide?.filepath || template.backSide?.url;
                                }}
                            />
                        ) : (
                            <i className="pi pi-image text-gray-400"></i>
                        )}
                    </div>
                </div>
            </div>

            {/* Template Info */}
            <div className="space-y-2">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                        {template.description && (
                            <p className="text-sm text-gray-600 truncate">{template.description}</p>
                        )}
                    </div>
                    {template.isDefault && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-medium">
                            Default
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                    {!template.isDefault && (
                        <button
                            onClick={() => onSetDefault(template._id)}
                            className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                            Set Default
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(template)}
                        className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// Upload Modal Component - UPDATED FOR BOTH SIDES
const UploadModal = ({ newTemplate, setNewTemplate, onFileSelect, onSubmit, onCancel, uploading }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Upload Template (Both Sides)</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                        <i className="pi pi-times text-xl"></i>
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Template Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Name
                        </label>
                        <input
                            type="text"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter template name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={newTemplate.description}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>

                    {/* Front Side Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Front Side (Dynamic Data)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg"
                                onChange={(e) => onFileSelect('frontSide', e)}
                                className="hidden"
                                id="front-upload"
                                required
                            />
                            <label htmlFor="front-upload" className="cursor-pointer">
                                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <i className="pi pi-upload text-white text-xl"></i>
                                </div>
                                <p className="font-medium text-gray-900">
                                    {newTemplate.frontSide ? newTemplate.frontSide.name : 'Choose Front Side'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Student photo and data will be placed here
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* Back Side Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Back Side (Static Content)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg"
                                onChange={(e) => onFileSelect('backSide', e)}
                                className="hidden"
                                id="back-upload"
                                required
                            />
                            <label htmlFor="back-upload" className="cursor-pointer">
                                <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <i className="pi pi-upload text-white text-xl"></i>
                                </div>
                                <p className="font-medium text-gray-900">
                                    {newTemplate.backSide ? newTemplate.backSide.name : 'Choose Back Side'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Rules, contact info, etc. (same for all cards)
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* Set as Default */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="set-default"
                            checked={newTemplate.setAsDefault}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, setAsDefault: e.target.checked }))}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="set-default" className="ml-2 text-sm text-gray-700">
                            Set as default template
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || !newTemplate.frontSide || !newTemplate.backSide}
                            className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploading ? (
                                <span className="flex items-center justify-center">
                                    <i className="pi pi-spinner pi-spin mr-2"></i>
                                    Uploading...
                                </span>
                            ) : (
                                'Upload Template'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TemplateManager;