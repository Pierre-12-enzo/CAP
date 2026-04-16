import React, { forwardRef, useImperativeHandle } from 'react';

const PermissionDocument = forwardRef(({ permissions, user }, ref) => {
  const containerRef = React.useRef(null);

  // Expose the ref to parent
  useImperativeHandle(ref, () => containerRef.current);

  if (!permissions || permissions.length === 0) {
    console.log('❌ No permissions to display');
    return null;
  }

  console.log('📄 Rendering permissions with student data:', permissions);

  // Helper function to safely format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  return (
    <div ref={containerRef} className="bg-white text-gray-800 print:p-0 print:m-0 print:w-full">
      {permissions.map((permission, index) => (
        <div key={permission._id || index} className="p-8 max-w-4xl mx-auto print:p-4 print:max-w-none print:break-inside-avoid">
          {/* Decorative Border */}
          <div className="border-4 border-emerald-600 rounded-2xl p-8 relative print:border-2 print:p-4">
            
            {/* School Header */}
            <div className="text-center mb-8 border-b-2 border-emerald-200 pb-6 print:mb-4 print:pb-3">
              <h1 className="text-4xl font-bold text-emerald-800 mb-2 print:text-3xl">
                OFFICIAL PERMISSION SLIP
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 mx-auto mb-4 print:mb-2"></div>
              <p className="text-lg text-gray-600 print:text-base">School Authorization Document</p>
            </div>

            {/* Student Information */}
            <div className="grid grid-cols-2 gap-8 mb-8 print:mb-4 print:gap-4">
              <div className="space-y-4 print:space-y-2">
                <div>
                  <label className="block text-sm font-semibold text-emerald-700 uppercase tracking-wide">
                    Student Information
                  </label>
                  <div className="mt-2 space-y-2 print:space-y-1">
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Full Name:</span>
                      <span className="font-semibold">{permission.student?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Student ID:</span>
                      <span className="font-mono">{permission.student?.student_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Class:</span>
                      <span>{permission.student?.class || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Parent Phone:</span>
                      <span>{permission.student?.parent_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 print:space-y-2">
                <div>
                  <label className="block text-sm font-semibold text-cyan-700 uppercase tracking-wide">
                    Permission Details
                  </label>
                  <div className="mt-2 space-y-2 print:space-y-1">
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Permission #:</span>
                      <span className="font-mono text-emerald-700">{permission.permissionNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Issue Date:</span>
                      <span>{formatDate(permission.createdAt)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Departure:</span>
                      <span>{formatDate(permission.departure)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Return Date:</span>
                      <span className="font-semibold text-emerald-600">
                        {formatDate(permission.returnDate)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Status:</span>
                      <span className={`font-semibold ${permission.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {permission.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Permission Purpose */}
            <div className="mb-8 print:mb-4">
              <label className="block text-sm font-semibold text-purple-700 uppercase tracking-wide mb-3 print:mb-2">
                Purpose of Permission
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500 print:p-3">
                <p className="text-lg font-medium text-gray-800 print:text-base">
                  {permission.reason || 'No reason provided'}
                </p>
              </div>
            </div>

            {/* Destination & Guardian */}
            <div className="grid grid-cols-2 gap-8 mb-8 print:mb-4 print:gap-4">
              <div>
                <label className="block text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3 print:mb-2">
                  Destination
                </label>
                <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500 print:p-3">
                  <p className="font-medium text-gray-800">
                    {permission.destination || 'No destination provided'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3 print:mb-2">
                  Guardian Information
                </label>
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 space-y-2 print:p-3 print:space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span className="font-semibold">{permission.guardian?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Relationship:</span>
                    <span>{permission.guardian?.relationship || 'N/A'}</span>
                  </div>
                  {permission.guardian?.phone && (
                    <div className="flex justify-between">
                      <span className="font-medium">Phone:</span>
                      <span className="text-blue-700">{permission.guardian.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SMS Notification Status */}
            <div className="mb-8 print:mb-4">
              <label className="block text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 print:mb-2">
                Notification Status
              </label>
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500 print:p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${permission.smsNotifications?.permissionCreated?.sent ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
                    <span className="text-gray-800">
                      {permission.smsNotifications?.permissionCreated?.sent ? 'SMS Sent to Parent' : 'SMS Not Sent'}
                    </span>
                  </div>
                  {permission.smsNotifications?.permissionCreated?.sentAt && (
                    <span className="text-sm text-gray-600">
                      Sent: {formatDate(permission.smsNotifications.permissionCreated.sentAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Authorization Section */}
            <div className="mt-12 pt-6 border-t-2 border-gray-300 print:mt-8 print:pt-4">
              <div className="grid grid-cols-2 gap-8 print:gap-4">
                <div className="text-center">
                  <div className="mb-4 print:mb-2">
                    <div className="h-16 border-b border-gray-300 print:h-12"></div>
                    <p className="text-sm text-gray-600 mt-2 print:mt-1 print:text-xs">Guardian's Signature</p>
                    <p className="text-xs text-gray-500 mt-1">({permission.guardian?.name})</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="mb-4 print:mb-2">
                    <div className="h-16 border-b border-gray-300 print:h-12"></div>
                    <p className="text-sm text-gray-600 mt-2 print:mt-1 print:text-xs">School Authority Signature</p>
                  </div>
                  <p className="text-xs text-gray-500 print:text-2xs">
                    Approved by: {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Date: {formatDate(permission.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center print:mt-4 print:pt-2">
              <p className="text-xs text-gray-500 print:text-2xs">
                This is an official school document. Unauthorized duplication is prohibited.
              </p>
              <p className="text-xs text-gray-500 mt-1 print:mt-0 print:text-2xs">
                Document ID: {permission._id} • Generated on: {new Date().toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1 print:mt-0 print:text-2xs">
                Status: {permission.status.toUpperCase()} • SMS: {permission.smsNotifications?.permissionCreated?.sent ? 'SENT' : 'NOT SENT'}
              </p>
            </div>
          </div>
          
          {/* Page break for printing multiple permissions */}
          {index < permissions.length - 1 && (
            <div className="page-break print:break-after-page"></div>
          )}
        </div>
      ))}
    </div>
  );
});

PermissionDocument.displayName = 'PermissionDocument';

export default PermissionDocument;