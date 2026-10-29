
import { useEffect, useMemo, useState } from "react";
import api from "./api";
import Login from "./Login";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  position: "",
  salary: "",
  joining_date: "",
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("access"))
  );

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const itemsPerPage = 5;

  // Load employees from the Django API
  async function loadEmployees() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("employee/");

      // Supports normal arrays and Django REST Framework pagination
      const data = response.data;
      const employeeList = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];

      setEmployees(employeeList);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setIsLoggedIn(false);
      } else {
        setError(
          err.response?.data?.detail ||
            "Unable to load employees. Please check the Django server."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // Load employees after successful login
  useEffect(() => {
    if (isLoggedIn) {
      loadEmployees();
    }
  }, [isLoggedIn]);

  // Update form fields
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  // Add or update an employee
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const payload = {
      ...form,
      salary: Number(form.salary),
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`employee/${editingId}/`, payload);
        setMessage("Employee updated successfully.");
      } else {
        await api.post("employee/", payload);
        setMessage("Employee added successfully.");
      }

      setForm(emptyForm);
      setEditingId(null);

      await loadEmployees();
    } catch (err) {
      const data = err.response?.data;

      if (data && typeof data === "object") {
        const validationMessages = Object.entries(data)
          .map(([field, value]) => {
            const details = Array.isArray(value)
              ? value.join(", ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value);

            return `${field}: ${details}`;
          })
          .join(" | ");

        setError(validationMessages || "Unable to save employee.");
      } else {
        setError("Unable to save employee. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Fill the form with employee details for editing
  function handleEdit(employee) {
    setEditingId(employee.id);

    setForm({
      name: employee.name ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      department: employee.department ?? "",
      position: employee.position ?? "",
      salary: employee.salary ?? "",
      joining_date: employee.joining_date ?? "",
    });

    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete an employee
  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this employee?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`employee/${id}/`);
      setMessage("Employee deleted successfully.");

      if (editingId === id) {
        handleCancelEdit();
      }

      await loadEmployees();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete employee. Please try again."
      );
    }
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  // Log out
  function handleLogout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    setIsLoggedIn(false);
    setEmployees([]);
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setMessage("");
  }

  // Department options for the filter
  const departments = useMemo(() => {
    return [
      "All",
      ...new Set(
        employees
          .map((employee) => employee.department)
          .filter(Boolean)
      ),
    ];
  }, [employees]);

  // Search and filter employees
  const filteredEmployees = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = [
        employee.name,
        employee.email,
        employee.department,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(searchText)
      );

      const matchesDepartment =
        departmentFilter === "All" ||
        employee.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [employees, search, departmentFilter]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / itemsPerPage)
  );

  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;

  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter]);

  // Show login until a token is available
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={() => {
          setError("");
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="mb-1">Employee Management System</h1>
          <p className="text-muted mb-0">
            Manage your employee records
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      {/* Employee form */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            {editingId !== null ? "Edit Employee" : "Add Employee"}
          </h5>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="phone" className="form-label">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  className="form-control"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="department" className="form-label">
                  Department
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  className="form-control"
                  value={form.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="position" className="form-label">
                  Position
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  className="form-control"
                  value={form.position}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="salary" className="form-label">
                  Salary
                </label>
                <input
                  id="salary"
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.salary}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="joining_date" className="form-label">
                  Joining Date
                </label>
                <input
                  id="joining_date"
                  name="joining_date"
                  type="date"
                  className="form-control"
                  value={form.joining_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="mt-3 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Employee"
                    : "Add Employee"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Search and filter */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-8">
              <label htmlFor="search" className="form-label">
                Search Employees
              </label>
              <input
                id="search"
                type="search"
                className="form-control"
                placeholder="Search by name, email, or department"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="departmentFilter" className="form-label">
                Filter by Department
              </label>
              <select
                id="departmentFilter"
                className="form-select"
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value)
                }
              >
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employee table */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Employee List</h5>
          <span className="badge text-bg-primary">
            {filteredEmployees.length} employees
          </span>
        </div>

        <div className="card-body">
          {loading ? (
            <p className="text-center my-4">Loading employees...</p>
          ) : paginatedEmployees.length === 0 ? (
            <p className="text-center text-muted my-4">
              No employees found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Salary</th>
                    <th>Joining Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.id}</td>
                      <td>{employee.name}</td>
                      <td>{employee.email}</td>
                      <td>{employee.phone}</td>
                      <td>{employee.department}</td>
                      <td>{employee.position}</td>
                      <td>{employee.salary}</td>
                      <td>{employee.joining_date}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            onClick={() => handleEdit(employee)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(employee.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination controls */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
            <small className="text-muted">
              {filteredEmployees.length === 0
                ? "Showing 0 employees"
                : `Showing ${startIndex + 1}–${Math.min(
                    startIndex + itemsPerPage,
                    filteredEmployees.length
                  )} of ${filteredEmployees.length}`}
            </small>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={safePage <= 1}
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
              >
                Previous
              </button>

              <span className="align-self-center">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
