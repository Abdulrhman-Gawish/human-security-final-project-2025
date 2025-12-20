import { useState, useEffect } from "react";
import {
  LogOut,
  FileText,
  RefreshCw,
  Download,
  User,
  Save,
} from "lucide-react";
import {
  logout,
  getCurrentUser,
  getAllDocuments,
  updateUserProfile,
  downloadDocument,
} from "../services/api";
export default function NormalUserDashboard() {
  const [activeTab, setActiveTab] = useState("documents");
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllDocuments();
      setDocuments(response.data);
    } catch (err) {
      setError("Failed to fetch documents. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCurrentUser();
      //   const response = {
      //     data: {
      //       name: "John Doe",
      //       email: "john.doe@example.com",
      //       role: "user"
      //     }
      //   };
      setProfile({
        name: response.data.name,
        email: response.data.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError("Failed to fetch profile. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "documents") {
      fetchDocuments();
    } else if (activeTab === "profile") {
      fetchProfile();
    }
  }, [activeTab]);

  const handleDownload = async (docId) => {
    console.log("Print Id", docId);

    setIsLoading(true);
    setError(null);
    try {
      const blob = await downloadDocument(docId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "document");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Download failed");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (profile.newPassword) {
      if (profile.newPassword !== profile.confirmPassword) {
        setError("New passwords do not match");
        return;
      }
      if (!profile.currentPassword) {
        setError("Current password is required to change password");
        return;
      }
    }

    setLoading(true);
    try {
      const updateData = {
        name: profile.name,
        email: profile.email,
      };

      if (profile.newPassword) {
        updateData.currentPassword = profile.currentPassword;
        updateData.newPassword = profile.newPassword;
      }

      // Replace with your actual API call
      await updateUserProfile(updateData);
      //   console.log("Updating profile:", updateData);

      setSuccess("Profile updated successfully!");
      setProfile((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("token");
      window.location.href = "/login";
    } catch (err) {
      console.error("Error during logout:", err);
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  return (
    <div className='min-h-screen bg-gray-100'>
      <header className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900'>My Dashboard</h1>
          <button
            onClick={handleLogout}
            className='flex items-center text-gray-700 hover:text-gray-900 transition-colors'
          >
            <LogOut size={18} className='mr-1' />
            Logout
          </button>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='flex border-b mb-6'>
          <button
            className={`px-4 py-2 transition-colors ${
              activeTab === "documents"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("documents")}
          >
            <div className='flex items-center'>
              <FileText size={18} className='mr-2' />
              Documents
            </div>
          </button>
          <button
            className={`px-4 py-2 transition-colors ${
              activeTab === "profile"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            <div className='flex items-center'>
              <User size={18} className='mr-2' />
              My Profile
            </div>
          </button>
        </div>

        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
            {error}
          </div>
        )}
        {success && (
          <div className='bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4'>
            {success}
          </div>
        )}

        {activeTab === "documents" && (
          <div>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold flex items-center text-gray-800'>
                <FileText className='mr-2' />
                Available Documents
              </h2>
              <button
                onClick={fetchDocuments}
                className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center transition-colors'
              >
                <RefreshCw size={18} className='mr-1' />
                Refresh
              </button>
            </div>

            <div className='bg-white shadow overflow-hidden rounded-lg'>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Document Name
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Uploaded At
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Uploaded By
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {loading && documents.length === 0 ? (
                      <tr>
                        <td colSpan='4' className='px-6 py-4 text-center'>
                          <div className='flex justify-center'>
                            <RefreshCw
                              size={24}
                              className='animate-spin text-blue-500'
                            />
                          </div>
                        </td>
                      </tr>
                    ) : documents.length === 0 ? (
                      <tr>
                        <td
                          colSpan='4'
                          className='px-6 py-4 text-center text-gray-500'
                        >
                          No documents available
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc, index) => {
                        // console.log("id:", doc.id, "_id:", doc._id);

                        const docId = doc._id || doc.id;

                        return (
                          <tr
                            key={docId}
                            className='hover:bg-gray-50 transition-colors'
                          >
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <div className='flex items-center'>
                                <FileText
                                  size={16}
                                  className='mr-2 text-blue-500'
                                />
                                <span className='text-gray-900 font-medium'>
                                  {doc.docName || doc.name}
                                </span>
                              </div>
                            </td>

                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {formatDate(doc.uploadedAt)}
                            </td>

                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {doc.uploadedBy?.name || doc.uploadedBy || "N/A"}
                            </td>

                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                              <button
                                onClick={() => handleDownload(docId)}
                                className='text-blue-600 hover:text-blue-900 flex items-center justify-end w-full transition-colors'
                                title='Download'
                              >
                                <Download size={16} className='mr-1' />
                                Download
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div>
            <h2 className='text-xl font-semibold mb-4 flex items-center text-gray-800'>
              <User className='mr-2' />
              My Profile
            </h2>

            <div className='bg-white shadow rounded-lg p-6 max-w-2xl'>
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  name='name'
                  value={profile.name}
                  onChange={handleProfileChange}
                  required
                  className='block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border'
                />
              </div>

              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Email
                </label>
                <input
                  type='email'
                  name='email'
                  value={profile.email}
                  onChange={handleProfileChange}
                  required
                  className='block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border'
                />
              </div>

              <hr className='my-6' />

              <h3 className='text-lg font-medium text-gray-900 mb-4'>
                Change Password (Optional)
              </h3>

              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Current Password
                </label>
                <input
                  type='password'
                  name='currentPassword'
                  value={profile.currentPassword}
                  onChange={handleProfileChange}
                  className='block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border'
                />
              </div>

              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  New Password
                </label>
                <input
                  type='password'
                  name='newPassword'
                  value={profile.newPassword}
                  onChange={handleProfileChange}
                  className='block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border'
                />
              </div>

              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Confirm New Password
                </label>
                <input
                  type='password'
                  name='confirmPassword'
                  value={profile.confirmPassword}
                  onChange={handleProfileChange}
                  className='block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border'
                />
              </div>

              <div className='flex justify-end'>
                <button
                  onClick={handleProfileSubmit}
                  disabled={loading}
                  className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded flex items-center transition-colors disabled:opacity-50'
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className='animate-spin mr-2' />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} className='mr-2' />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
