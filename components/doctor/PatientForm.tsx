import { Input } from "../../components/ui/input";

export default function PatientForm({ form, onChange }: {
  form: any,
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-gray-700 mb-1 font-medium">Name</label>
        <Input name="name" value={form.name} onChange={onChange} required className="text-black" />
      </div>
      <div>
        <label className="block text-gray-700 mb-1 font-medium">Age</label>
        <Input name="age" type="number" value={form.age} onChange={onChange} required className="text-black" />
      </div>
      <div>
        <label className="block text-gray-700 mb-1 font-medium">Gender</label>
        <select
          name="gender"
          value={form.gender}
          onChange={onChange}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white"
        >
          <option value="" disabled>Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-gray-700 mb-1 font-medium">National ID</label>
        <Input name="nationalId" value={form.nationalId} onChange={onChange} required className="text-black" />
      </div>
      <div>
        <label className="block text-gray-700 mb-1 font-medium">Contact Info</label>
        <Input name="contactInfo" value={form.contactInfo} onChange={onChange} className="text-black" />
      </div>
    </div>
  );
}
