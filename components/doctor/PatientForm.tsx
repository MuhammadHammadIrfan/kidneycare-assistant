import { Input } from "../../components/ui/input";

export default function PatientForm({ form, onChange }: {
  form: any,
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <div>
        <label className="block text-gray-700 mb-2 font-medium text-sm lg:text-base">
          Name <span className="text-red-500">*</span>
        </label>
        <Input 
          name="name" 
          value={form.name} 
          onChange={onChange} 
          required 
          className="text-black text-sm lg:text-base h-10 lg:h-12" 
          placeholder="Enter patient name"
        />
      </div>
      <div>
        <label className="block text-gray-700 mb-2 font-medium text-sm lg:text-base">
          Age <span className="text-red-500">*</span>
        </label>
        <Input 
          name="age" 
          type="number" 
          value={form.age} 
          onChange={onChange} 
          required 
          className="text-black text-sm lg:text-base h-10 lg:h-12" 
          placeholder="Enter age"
          min="1"
          max="120"
        />
      </div>
      <div>
        <label className="block text-gray-700 mb-2 font-medium text-sm lg:text-base">
          Gender <span className="text-red-500">*</span>
        </label>
        <select
          name="gender"
          value={form.gender}
          onChange={onChange}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 lg:py-3 text-black bg-white text-sm lg:text-base h-10 lg:h-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="" disabled>Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-gray-700 mb-2 font-medium text-sm lg:text-base">
          Hospital ID <span className="text-red-500">*</span>
          {/* Natioal Id is used allover in backed and db, just for frontend changed to Hospital Id */}
        </label>
        <Input 
          name="nationalId" 
          value={form.nationalId} 
          onChange={onChange} 
          required 
          className="text-black text-sm lg:text-base h-10 lg:h-12" 
          placeholder="Enter hospital ID"
        />
        {/* Natioal Id is used allover in backed and db, just for frontend changed to Hospital Id */}
      </div>
      <div className="lg:col-span-2">
        <label className="block text-gray-700 mb-2 font-medium text-sm lg:text-base">
          Contact Info
        </label>
        <Input 
          name="contactInfo" 
          value={form.contactInfo} 
          onChange={onChange} 
          className="text-black text-sm lg:text-base h-10 lg:h-12" 
          placeholder="Enter contact information (optional)"
        />
      </div>
    </div>
  );
}
